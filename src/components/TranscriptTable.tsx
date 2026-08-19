import { useEffect, useMemo, useRef } from 'react';
import type { EafTier } from '../lib/eaf';
import { formatTimecode } from '../lib/formatters';
import { findActiveRow, mergeAnnotations } from '../lib/transcript';

interface TranscriptTableProps {
  tiers: EafTier[];
  currentTimeMs?: number;
  onSeek?: (ms: number) => void;
}

const headerClass = 'px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-primary-500';

export const TranscriptTable = ({ tiers, currentTimeMs, onSeek }: TranscriptTableProps) => {
  const rows = useMemo(() => mergeAnnotations(tiers), [tiers]);
  const activeRow = currentTimeMs === undefined ? -1 : findActiveRow(rows, currentTimeMs);
  const showTierLabels = tiers.length > 1;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || activeRow < 0) {
      return;
    }
    const row = container.querySelector<HTMLElement>(`[data-row="${activeRow}"]`);
    if (!row) {
      return;
    }

    // Scroll the container alone, never the page: scrollIntoView would drag the
    // player off screen every time the playhead crossed an annotation.
    const rowBox = row.getBoundingClientRect();
    const containerBox = container.getBoundingClientRect();
    if (rowBox.top >= containerBox.top && rowBox.bottom <= containerBox.bottom) {
      return;
    }
    container.scrollTo({
      top: container.scrollTop + rowBox.top - containerBox.top - (container.clientHeight - rowBox.height) / 2,
      behavior: 'smooth',
    });
  }, [activeRow]);

  return (
    <div ref={scrollRef} className="max-h-96 overflow-y-auto rounded-lg border border-primary-200">
      <table className="min-w-full divide-y divide-primary-200">
        <thead className="sticky top-0 z-10 bg-primary-50">
          <tr>
            <th className={`${headerClass} w-24`}>Start</th>
            <th className={`${headerClass} w-24`}>End</th>
            <th className={headerClass}>Text</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-primary-100 bg-white">
          {rows.map((row, index) => (
            <tr
              key={`${row.startMs}-${row.endMs}`}
              data-row={index}
              className={`${index === activeRow ? 'bg-primary-100 font-semibold' : 'hover:bg-primary-50'} ${onSeek ? 'cursor-pointer' : ''}`}
              tabIndex={onSeek ? 0 : undefined}
              onClick={onSeek && (() => onSeek(row.startMs))}
              onKeyDown={
                onSeek &&
                ((event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSeek(row.startMs);
                  }
                })
              }
            >
              <td className="px-3 py-1.5 font-mono text-xs tabular-nums text-primary-500">{formatTimecode(row.startMs)}</td>
              <td className="px-3 py-1.5 font-mono text-xs tabular-nums text-primary-500">{formatTimecode(row.endMs)}</td>
              <td className="px-3 py-1.5 text-sm text-primary-900">
                {row.texts.map((text) => (
                  <div key={text.id}>
                    {showTierLabels && <span className="mr-1 text-xs text-primary-400">{text.tierId}:</span>}
                    {text.value}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
