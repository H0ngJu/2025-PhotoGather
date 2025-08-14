import defaultImage from '@assets/images/default_image.png';
// import diamond from '@assets/images/diamond.png';
import high from '@assets/images/high.jpeg';
import { useEffect, useMemo, useState } from 'react';

// import rocket from '@assets/images/rocket.png';
// ---- 설정값 ----
const CONCURRENCY = 4; // 동시에 변환할 개수(과도한 동시 fetch 방지)
const BATCH_SIZE = 25; // 한 번에 공유할 파일 개수(장치 한계 회피)

// 100장 (2장을 반복)
const base = [defaultImage, high] as const;
const mockImages = Array.from({ length: 100 }, (_, i) => base[i % base.length]);

// ---- 유틸 ----
const urlToFile = async (url: string, index: number): Promise<File> => {
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error(`이미지 요청 실패: ${res.status}`);
  const blob = await res.blob();
  const mime = blob.type || 'image/jpeg';
  const ext = (mime.split('/')[1] || 'jpg').split('+')[0]; // e.g. image/heic+something 방지
  return new File([blob], `image_${index + 1}.${ext}`, { type: mime });
};

const mapWithConcurrency = async <T, R>(
  items: T[],
  worker: (item: T, idx: number) => Promise<R>,
  concurrency = 4,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) break;
        results[idx] = await worker(items[idx], idx);
      }
    }),
  );
  return results;
};

const chunk = <T,>(arr: T[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, (i + 1) * size),
  );

// ---- 컴포넌트 ----
const ShareButton = () => {
  const images = useMemo(() => mockImages, []);
  const [files, setFiles] = useState<File[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // 1) 마운트 후 "미리" File 준비 (사용자 제스처와 분리)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const f = await mapWithConcurrency(
          images,
          async (u, i) => {
            const file = await urlToFile(u, i);
            if (!cancelled) setProgress((p) => p + 1);
            return file;
          },
          CONCURRENCY,
        );
        if (!cancelled) setFiles(f);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [images]);

  // 2) 클릭 시엔 share만 즉시 수행 (긴 await 금지)
  const handleClick = async () => {
    try {
      if (!files) {
        alert('이미지 준비 중이에요. 잠시만 기다려주세요.');
        return;
      }
      if (!('share' in navigator) || !('canShare' in navigator)) {
        alert('Web Share API를 지원하지 않는 브라우저입니다.');
        return;
      }

      const groups = chunk(files, BATCH_SIZE);
      for (const group of groups) {
        if (!navigator.canShare({ files: group })) {
          // 장치/앱이 이 개수를 못 받는 경우 더 잘게 쪼개서 시도
          const smaller = chunk(group, Math.max(1, Math.floor(BATCH_SIZE / 2)));
          for (const sg of smaller) {
            if (navigator.canShare({ files: sg })) {
              // 사용자 제스처가 유지되는 동안 바로 호출
              // (필요하면 "다음 묶음 공유" 버튼로 나눠 UI 제공)
              // eslint-disable-next-line no-await-in-loop
              await navigator.share({
                files: sg,
                title: '사진 공유',
                text: '테스트',
              });
            } else {
              alert('이 장치에서 해당 파일 묶음을 공유할 수 없습니다.');
              return;
            }
          }
        } else {
          // eslint-disable-next-line no-await-in-loop
          await navigator.share({
            files: group,
            title: '사진 공유',
            text: '테스트',
          });
        }
      }
    } catch (error) {
      console.log(
        'userActivation?',
        (navigator as any).userActivation?.isActive,
      );
      alert(
        error instanceof Error ? error.message : '공유 중 오류가 발생했습니다.',
      );
    }
  };

  return (
    <button type="button" onClick={handleClick} disabled={loading}>
      {loading
        ? `사진 준비 중… (${progress}/${images.length})`
        : '저장/공유하기'}
    </button>
  );
};

export default ShareButton;
