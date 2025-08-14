import defaultImage from '@assets/images/default_image.png';
import diamond from '@assets/images/diamond.png';
import high from '@assets/images/high.jpeg';

import rocket from '@assets/images/rocket.png';

const base = [defaultImage, diamond, rocket] as const;

export const mockImages: string[] = Array.from(
  { length: 1 },
  (_, i) => base[i % base.length],
);

// utils/shareImages.ts
export const urlToFile = async (url: string, index: number): Promise<File> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`이미지 요청 실패: ${response.status}`);
  const blob = await response.blob();
  const mime = blob.type || 'image/jpeg';
  const ext = mime.split('/')[1] || 'jpg';
  return new File([blob], `image_${index + 1}.${ext}`, { type: mime });
};

export const shareImagesOnIOS = async (images: string[]) => {
  if (!('share' in navigator) || !('canShare' in navigator)) {
    throw new Error('Web Share API를 지원하지 않는 브라우저입니다.');
  }
  const files = await Promise.all(images.map((u, i) => urlToFile(u, i)));
  if (!navigator.canShare({ files })) {
    throw new Error('이 장치에서 파일 공유를 지원하지 않습니다.');
  }
  await navigator.share({
    files,
    title: '사진 공유',
    text: '테스트 이미지입니다.',
  });
};

const ShareButton = () => {
  const handleClick = async () => {
    try {
      await shareImagesOnIOS(mockImages);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : '공유 중 오류가 발생했습니다.',
      );
    }
  };
  return (
    <button type="button" onClick={handleClick}>
      iPhone으로 저장하기
    </button>
  );
};

export default ShareButton;
