import type { MediaSync } from './mediaSync';

export const VideoPlayer = ({ src, filename, sync }: { src: string; filename: string; sync?: MediaSync }) => {
  return (
    <div className="rounded-lg border border-primary-200 bg-primary-50 p-3">
      <p className="mb-2 text-sm font-medium text-primary-700">{filename}</p>
      <video controls preload="metadata" playsInline className="max-h-96 w-full rounded" aria-label={`Video player for ${filename}`} {...sync}>
        <source src={src} />
        Your browser does not support the video element.
      </video>
    </div>
  );
};
