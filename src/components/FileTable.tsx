import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { formatDuration, formatFileSize } from '../lib/formatters';
import {
  getMediaAction,
  getMediaLabel,
  isPlayableAudio,
} from '../lib/mediaTypes';
import type { CatalogFile } from '../lib/types';
import { AudioPlayer } from './AudioPlayer';
import { DownloadLink } from './DownloadLink';
import { ImageViewer } from './ImageViewer';

const columnHelper = createColumnHelper<CatalogFile>();

const columns = [
  columnHelper.accessor('filename', {
    header: 'Filename',
    cell: (info) => (
      <span className="font-mono text-sm">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('encodingFormat', {
    header: 'Type',
    cell: (info) => (
      <span className="text-sm">{getMediaLabel(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('contentSize', {
    header: 'Size',
    cell: (info) => (
      <span className="text-sm">{formatFileSize(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('duration', {
    header: 'Duration',
    cell: (info) => {
      const val = info.getValue();
      return <span className="text-sm">{val ? formatDuration(val) : '—'}</span>;
    },
  }),
];

export const FileTable = ({ files }: { files: CatalogFile[] }) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: files,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Separate media for inline display
  const playableAudio = files.filter((f) => isPlayableAudio(f.encodingFormat));
  const images = files.filter(
    (f) => getMediaAction(f.encodingFormat) === 'image',
  );
  const downloads = files.filter(
    (f) =>
      getMediaAction(f.encodingFormat) === 'download' ||
      (getMediaAction(f.encodingFormat) === 'audio' &&
        !isPlayableAudio(f.encodingFormat)),
  );

  return (
    <div className="space-y-6">
      {/* Inline audio players */}
      {playableAudio.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-primary-700">Audio</h3>
          {playableAudio.map((f) => (
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
              <DownloadLink
                key={f.filename}
                path={f.path}
                filename={f.filename}
                encodingFormat={f.encodingFormat}
                contentSize={f.contentSize}
              />
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
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {{ asc: ' ▲', desc: ' ▼' }[
                          header.column.getIsSorted() as string
                        ] ?? ''}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-primary-100 bg-white">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-primary-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
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
