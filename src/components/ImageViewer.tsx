export const ImageViewer = ({
  src,
  filename,
}: {
  src: string;
  filename: string;
}) => {
  return (
    <div className="rounded-lg border border-primary-200 bg-primary-50 p-3">
      <p className="mb-2 text-sm font-medium text-primary-700">{filename}</p>
      <img
        src={src}
        alt={filename}
        className="max-h-96 rounded"
        loading="lazy"
      />
    </div>
  );
};
