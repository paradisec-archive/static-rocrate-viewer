export const VideoPlayer = ({ src, filename }: { src: string; filename: string }) => {
  return (
    <div className="rounded-lg border border-primary-200 bg-primary-50 p-3">
      <p className="mb-2 text-sm font-medium text-primary-700">{filename}</p>
      {/* biome-ignore lint/a11y/useMediaCaption: field recordings ship no caption track — the .eaf transcript beneath is what carries the words */}
      <video controls preload="metadata" playsInline className="max-h-96 w-full rounded" aria-label={`Video player for ${filename}`}>
        <source src={src} />
        Your browser does not support the video element.
      </video>
    </div>
  );
};
