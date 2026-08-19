import { describe, expect, it } from 'vitest';
import type { EafAnnotation, EafDocument, EafTier } from './eaf.ts';
import { defaultTierIds, findActiveRow, mergeAnnotations, textBearingTiers } from './transcript.ts';

let nextId = 0;
const annotation = (startMs: number, endMs: number, value: string): EafAnnotation => ({
  id: `a${nextId++}`,
  startMs,
  endMs,
  value,
});

const tier = (tierId: string, annotations: EafAnnotation[]): EafTier => ({ tierId, annotations });

const document = (tiers: EafTier[]): EafDocument => ({ languages: [], tiers });

describe('textBearingTiers', () => {
  it('drops the ref tier that only carries timing', () => {
    // KD1-VU20180811SAN-01: `ref` time-aligns 65 spans that Transcription inherits.
    const doc = document([
      tier('ref', [annotation(0, 1000, ''), annotation(1000, 2000, '')]),
      tier('Transcription', [annotation(0, 1000, 'wan'), annotation(1000, 2000, 'tu')]),
    ]);
    expect(textBearingTiers(doc).map((t) => t.tierId)).toEqual(['Transcription']);
  });

  it('drops tiers with no annotations at all', () => {
    const doc = document([tier('Words', []), tier('Transcription', [annotation(0, 1, 'x')])]);
    expect(textBearingTiers(doc).map((t) => t.tierId)).toEqual(['Transcription']);
  });

  it('drops a tier whose single annotation is whitespace', () => {
    // KD1-VU20180811SAN-02 carries exactly one such stray annotation.
    const doc = document([tier('Translation', [annotation(0, 1, '  ')])]);
    expect(textBearingTiers(doc)).toEqual([]);
  });

  it('keeps a tier that has empty annotations among real ones', () => {
    // NT1-001-001B: 110 of Channel1's 451 annotations are empty, and those
    // silences are part of the transcript.
    const doc = document([tier('Channel1', [annotation(0, 1, ''), annotation(1, 2, 'ngaya'), annotation(2, 3, '')])]);
    expect(textBearingTiers(doc).map((t) => t.tierId)).toEqual(['Channel1']);
  });
});

describe('defaultTierIds', () => {
  it('pre-selects every tier when there are five or fewer', () => {
    const tiers = ['a', 'b', 'c', 'd', 'e'].map((id) => tier(id, []));
    expect(defaultTierIds(tiers)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('pre-selects only the first once there are more than five', () => {
    const tiers = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => tier(id, []));
    expect(defaultTierIds(tiers)).toEqual(['a']);
  });
});

describe('mergeAnnotations', () => {
  it('groups annotations that share a span into one row, in tier order', () => {
    const rows = mergeAnnotations([tier('Transcription', [annotation(0, 1000, 'wan')]), tier('Translation', [annotation(0, 1000, 'one')])]);
    expect(rows).toHaveLength(1);
    expect(rows[0].texts.map((t) => [t.tierId, t.value])).toEqual([
      ['Transcription', 'wan'],
      ['Translation', 'one'],
    ]);
  });

  it('keeps spans that merely overlap apart', () => {
    const rows = mergeAnnotations([tier('t', [annotation(0, 1000, 'a'), annotation(500, 1500, 'b')])]);
    expect(rows.map((r) => [r.startMs, r.endMs])).toEqual([
      [0, 1000],
      [500, 1500],
    ]);
  });

  it('sorts by start, then by end', () => {
    const rows = mergeAnnotations([tier('t', [annotation(200, 300, 'c'), annotation(100, 400, 'b'), annotation(100, 200, 'a')])]);
    expect(rows.map((r) => [r.startMs, r.endMs])).toEqual([
      [100, 200],
      [100, 400],
      [200, 300],
    ]);
  });

  it('keeps empty-valued annotations as rows', () => {
    const rows = mergeAnnotations([tier('Channel1', [annotation(0, 1000, '')])]);
    expect(rows).toHaveLength(1);
    expect(rows[0].texts[0].value).toBe('');
  });
});

describe('findActiveRow', () => {
  const rows = mergeAnnotations([tier('t', [annotation(0, 1000, 'a'), annotation(1000, 2000, 'b')])]);

  it('treats the span as half-open, so adjacent rows never both match', () => {
    expect(findActiveRow(rows, 999)).toBe(0);
    expect(findActiveRow(rows, 1000)).toBe(1);
  });

  it('reports nothing active in a gap or past the end', () => {
    expect(findActiveRow(rows, 2000)).toBe(-1);
    expect(findActiveRow(mergeAnnotations([tier('t', [annotation(1000, 2000, 'a')])]), 500)).toBe(-1);
  });
});
