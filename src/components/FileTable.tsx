import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  type SortingState,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { formatDuration, formatFileSize } from '../lib/formatters';
import { getMediaLabel, getMediaSection, type MediaSection } from '../lib/mediaTypes';
import type { CatalogFile } from '../lib/types';
import { AudioPlayer } from './AudioPlayer';
import { DownloadLink } from './DownloadLink';
import { ImageViewer } from './ImageViewer';
import { VideoPlayer } from './VideoPlayer';

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

const columnHelper = createColumnHelper<typeof features, CatalogFile>();

const columns = columnHelper.columns([
  columnHelper.accessor('filename', {
    header: 'Filename',
    cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
  }),
  columnHelper.accessor('encodingFormat', {
    header: 'Type',
    cell: (info) => <span className="text-sm">{getMediaLabel(info.getValue())}</span>,
  }),
  columnHelper.accessor('contentSize', {
    header: 'Size',
    cell: (info) => <span className="text-sm">{formatFileSize(info.getValue())}</span>,
  }),
  columnHelper.accessor('duration', {
    header: 'Duration',
    cell: (info) => {
      const val = info.getValue();
      return <span className="text-sm">{val ? formatDuration(val) : '—'}</span>;
    },
  }),
]);

export const FileTable = ({ files }: { files: CatalogFile[] }) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useTable({
    features,
    data: files,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
  });

  // Separate media for inline display
  const section = (name: MediaSection) => files.filter((f) => getMediaSection(f.encodingFormat) === name);
  const videos = section('video');
  const audio = section('audio');
  const images = section('image');
  const downloads = section('download');

  return (
    <div className="space-y-6">
      {/* Inline video players */}
      {videos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-primary-700">Video</h3>
          {videos.map((f) => (
            <VideoPlayer key={f.filename} src={f.path} filename={f.filename} />
          ))}
        </div>
      )}

      {/* Inline audio players */}
      {audio.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-primary-700">Audio</h3>
          {audio.map((f) => (
            <AudioPlayer key={f.filename} src={f.path} filename={f.filename} />
          ))}
        </div>
      )}

      {/* Inline images */}
      {images.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-primary-700">Images</h3>
          {images.map((f) => (
            <ImageViewer key={f.filename} src={f.path} filename={f.filename} />
          ))}
        </div>
      )}

      {/* Downloads */}
      {downloads.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-primary-700">Downloads</h3>
          <div className="flex flex-wrap gap-2">
            {downloads.map((f) => (
              <DownloadLink key={f.filename} path={f.path} filename={f.filename} encodingFormat={f.encodingFormat} contentSize={f.contentSize} />
            ))}
          </div>
        </div>
      )}

      {/* File table */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-primary-700">All Files</h3>
        <div className="overflow-x-auto rounded-lg border border-primary-200">
          <table className="min-w-full divide-y divide-primary-200">
            <thead className="bg-primary-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="cursor-pointer px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-primary-500 select-none"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                        {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted() as string] ?? ''}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-primary-100 bg-white">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-primary-50">
                  {row.getAllCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2">
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
