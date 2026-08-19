import { describe, expect, it } from 'vitest';
import type { EafAnnotation, EafTier } from './eaf.ts';
import { lastAnnotationEndMs, timelineDurationMs, timelineTicks, VISIBLE_WINDOW_MS } from './timeline.ts';

let nextId = 0;
const annotation = (startMs: number, endMs: number): EafAnnotation => ({ id: `a${nextId++}`, startMs, endMs, value: 'x' });
const tier = (tierId: string, annotations: EafAnnotation[]): EafTier => ({ tierId, annotations });

const window = (durationMs: number) => Math.min(VISIBLE_WINDOW_MS, durationMs || VISIBLE_WINDOW_MS);

describe('timelineTicks', () => {
  it('has no ruler to draw without a duration', () => {
    expect(timelineTicks(0, VISIBLE_WINDOW_MS)).toEqual([]);
  });

  it('keeps roughly one tick per twentieth of the visible window', () => {
    // KD1-VU20180811SAN-03: 18.7 s, shorter than the window, so the window
    // shrinks to the recording and 18.7 s / 20 lands on the 1 s interval.
    const ticks = timelineTicks(18_739, window(18_739));
    expect(ticks.slice(0, 3).map((t) => t.ms)).toEqual([0, 1000, 2000]);
    expect(ticks).toHaveLength(19);
  });

  it('marks every fifth tick major below the 5 s interval', () => {
    const ticks = timelineTicks(18_739, window(18_739));
    expect(ticks.filter((t) => t.major).map((t) => t.ms)).toEqual([0, 5000, 10_000, 15_000]);
  });

  it('marks every second tick major at 5 s and above', () => {
    // NT1-001-001B: 18 minutes. The 30 s window asks for 1.5 s ticks, but 500
    // ticks over that length is the binding constraint, forcing 5 s.
    const ticks = timelineTicks(1_089_666, window(1_089_666));
    expect(ticks[1].ms).toBe(5000);
    expect(
      ticks
        .filter((t) => t.major)
        .slice(0, 3)
        .map((t) => t.ms),
    ).toEqual([0, 10_000, 20_000]);
  });

  it('never emits more than the tick ceiling', () => {
    // A 3-hour recording: the window alone would want 6480 ticks.
    expect(timelineTicks(10_800_000, VISIBLE_WINDOW_MS).length).toBeLessThanOrEqual(501);
  });

  it('falls back to the coarsest interval when even that is too fine', () => {
    const ticks = timelineTicks(500_000_000, VISIBLE_WINDOW_MS);
    expect(ticks[1].ms).toBe(300_000);
  });
});

describe('lastAnnotationEndMs', () => {
  it('takes the latest end across every tier, not the last tier listed', () => {
    expect(lastAnnotationEndMs([tier('Translation', [annotation(0, 9000)]), tier('Words', [annotation(0, 300)])])).toBe(9000);
  });

  it('is zero when nothing is annotated', () => {
    expect(lastAnnotationEndMs([tier('Words', [])])).toBe(0);
  });
});

describe('timelineDurationMs', () => {
  it('uses the host duration when it covers the transcript', () => {
    // NT1-001-001B: crate says 1089.68 s, annotations end at 1089.666 s.
    expect(timelineDurationMs([tier('Channel1', [annotation(0, 1_089_666)])], 1_089_680)).toBe(1_089_680);
  });

  it('stretches past a host that ends before the annotations do', () => {
    // KD1-VU20180811SAN-03: 15.836 s video hosting an EAF cut against 20.1 s audio.
    expect(timelineDurationMs([tier('Transcription', [annotation(17_000, 18_739)])], 15_836)).toBe(18_739);
  });

  it('falls back to the transcript when no host duration is known', () => {
    expect(timelineDurationMs([tier('Transcription', [annotation(0, 4200)])])).toBe(4200);
  });
});
