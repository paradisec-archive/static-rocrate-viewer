import type { EafDocument, EafTier } from './eaf';

/** One time span, carrying whatever the selected tiers say about it. */
export interface MergedRow {
  startMs: number;
  endMs: number;
  texts: { id: string; tierId: string; value: string }[];
}

/**
 * A tier is worth offering only if it carries text somewhere. ELAN's `ref` tiers
 * hold the time alignment that text tiers inherit through `ANNOTATION_REF` and
 * carry no value of their own, so selecting one adds a blank line to every row.
 *
 * Judged per tier, never per annotation: a tier of 451 annotations of which 110
 * are empty is a real tier, and those 110 are real silences in the recording.
 */
export const textBearingTiers = (document: EafDocument): EafTier[] =>
  document.tiers.filter((tier) => tier.annotations.some((annotation) => annotation.value.trim() !== ''));

const PRESELECT_LIMIT = 5;

export const defaultTierIds = (tiers: EafTier[]): string[] => (tiers.length <= PRESELECT_LIMIT ? tiers : tiers.slice(0, 1)).map((tier) => tier.tierId);

/**
 * Annotations sharing a time span become one row — the shape a reader wants,
 * with a transcription line and its translation side by side rather than
 * interleaved. Tier order follows the document, so the ordering within a row is
 * the linguist's own.
 */
export const mergeAnnotations = (tiers: EafTier[]): MergedRow[] => {
  const rows = new Map<string, MergedRow>();

  for (const tier of tiers) {
    for (const annotation of tier.annotations) {
      const key = `${annotation.startMs}-${annotation.endMs}`;
      const row = rows.get(key) ?? { startMs: annotation.startMs, endMs: annotation.endMs, texts: [] };
      row.texts.push({ id: annotation.id, tierId: tier.tierId, value: annotation.value });
      rows.set(key, row);
    }
  }

  return [...rows.values()].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
};

export const findActiveRow = (rows: MergedRow[], currentTimeMs: number): number =>
  rows.findIndex((row) => currentTimeMs >= row.startMs && currentTimeMs < row.endMs);
