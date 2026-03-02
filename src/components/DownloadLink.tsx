import { formatFileSize } from '../lib/formatters';
import { getMediaLabel } from '../lib/mediaTypes';

export const DownloadLink = ({
  path,
  filename,
  encodingFormat,
  contentSize,
}: {
  path: string;
  filename: string;
  encodingFormat: string;
  contentSize: number;
}) => {
  return (
    <a
      href={path}
      download={filename}
      className="inline-flex items-center gap-2 rounded-md border border-primary-300 px-3 py-1.5 text-sm text-primary-700 transition-colors hover:bg-primary-50"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
        role="img"
      >
        <title>Download</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16"
        />
      </svg>
      {filename}
      <span className="text-xs text-primary-400">
        ({getMediaLabel(encodingFormat)}, {formatFileSize(contentSize)})
      </span>
    </a>
  );
};
