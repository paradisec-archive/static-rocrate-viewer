export const AudioPlayer = ({
  src,
  filename,
}: {
  src: string;
  filename: string;
}) => {
  return (
    <div className="rounded-lg border border-primary-200 bg-primary-50 p-3">
      <p className="mb-2 text-sm font-medium text-primary-700">{filename}</p>
      {/* biome-ignore lint/a11y/useMediaCaption: audio archives don't have caption tracks */}
      <audio
        controls
        preload="none"
        className="w-full"
        aria-label={`Audio player for ${filename}`}
      >
        <source src={src} />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
};
