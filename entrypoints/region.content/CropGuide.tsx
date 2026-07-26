import type { CropArea } from '../shared/recording/types';

interface CropGuideProps {
  area: CropArea;
}

export function CropGuide({ area }: CropGuideProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed outline-2 outline-offset-2 outline-primary-300 shadow-[0_0_0_9999px_rgba(24,50,74,0.14)]"
      style={{
        left: `${area.x * 100}vw`,
        top: `${area.y * 100}vh`,
        width: `${area.width * 100}vw`,
        height: `${area.height * 100}vh`,
      }}
    />
  );
}
