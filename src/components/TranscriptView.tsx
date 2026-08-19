import { useMemo, useState } from 'react';
import type { Transcript } from '../lib/eaf';
import { formatDate } from '../lib/formatters';
import { defaultTierIds, textBearingTiers } from '../lib/transcript';
import { TranscriptTable } from './TranscriptTable';
import { TranscriptTimeline } from './TranscriptTimeline';

interface TranscriptViewProps {
  transcript: Transcript;
  /** Absent when nothing playable annotates this transcript — no sync, no seek. */
  currentTimeMs?: number;
  durationMs?: number;
  onSeek?: (ms: number) => void;
}

const VIEWS = ['Timeline', 'Table'] as const;

export const TranscriptView = ({ transcript, currentTimeMs, durationMs, onSeek }: TranscriptViewProps) => {
  const tiers = useMemo(() => textBearingTiers(transcript.document), [transcript]);
  const [selectedIds, setSelectedIds] = useState(() => defaultTierIds(tiers));
  // Synced to a player, the timeline is what a player is for — the playhead
  // moving across the tracks. Unsynced it is a static picture, so the table's
  // readable text wins (D19).
  const [view, setView] = useState<(typeof VIEWS)[number]>(currentTimeMs === undefined ? 'Table' : 'Timeline');

  if (tiers.length === 0) {
    return null;
  }

  const selectedTiers = tiers.filter((tier) => selectedIds.includes(tier.tierId));
  const allSelected = selectedIds.length === tiers.length;

  const toggleTier = (tierId: string) => setSelectedIds((current) => (current.includes(tierId) ? current.filter((id) => id !== tierId) : [...current, tierId]));

  const { author, date, languages } = transcript.document;
  const languageNames = languages.map((language) => language.langLabel ?? language.langId).join(', ');

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-primary-600">
        <span className="font-mono text-primary-700">{transcript.filename}</span>
        {author && <span>Author: {author}</span>}
        {date && <span>{formatDate(date)}</span>}
        {languageNames && <span>Languages: {languageNames}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <div className="inline-flex overflow-hidden rounded border border-primary-200">
          {VIEWS.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`px-2 py-0.5 text-xs ${view === mode ? 'bg-primary-600 text-white' : 'bg-white text-primary-600 hover:bg-primary-50'}`}
              aria-pressed={view === mode}
              onClick={() => setView(mode)}
            >
              {mode}
            </button>
          ))}
        </div>

        {tiers.length > 1 && (
          <>
            <span className="text-xs font-medium uppercase tracking-wider text-primary-500">Tiers</span>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(element) => {
                  if (element) {
                    element.indeterminate = selectedIds.length > 0 && !allSelected;
                  }
                }}
                onChange={() => setSelectedIds(allSelected ? [] : tiers.map((tier) => tier.tierId))}
              />
              All
            </label>
            {tiers.map((tier) => (
              <label key={tier.tierId} className="flex items-center gap-1.5">
                <input type="checkbox" checked={selectedIds.includes(tier.tierId)} onChange={() => toggleTier(tier.tierId)} />
                {tier.tierId}
              </label>
            ))}
          </>
        )}
      </div>

      {view === 'Timeline' ? (
        <TranscriptTimeline tiers={selectedTiers} currentTimeMs={currentTimeMs} durationMs={durationMs} onSeek={onSeek} />
      ) : (
        <TranscriptTable tiers={selectedTiers} currentTimeMs={currentTimeMs} onSeek={onSeek} />
      )}
    </div>
  );
};
