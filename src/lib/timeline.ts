import type { EafTier } from './eaf';

/**
 * How much of the recording the timeline shows at once. Everything else scrolls:
 * the track is `duration / VISIBLE_WINDOW_MS` times wider than the container, so
 * a 30-second window stays legible whether the recording runs 15 seconds or 18
 * minutes.
 */
export const VISIBLE_WINDOW_MS = 30_000;

export interface TimelineTick {
  ms: number;
  major: boolean;
}

const TICK_INTERVALS_MS = [500, 1000, 2000, 5000, 10_000, 30_000, 60_000, 120_000, 300_000];
const TARGET_TICKS_PER_WINDOW = 20;
const MAX_TICKS = 500;

/**
 * Ruler ticks at whichever round interval lands closest to one tick per 1/20th of
 * the visible window — so the ruler reads the same at any duration. The `MAX_TICKS`
 * floor stops a long recording from emitting thousands of DOM nodes when the
 * window-derived interval would be far too fine for its length.
 */
export const timelineTicks = (durationMs: number, visibleWindowMs: number): TimelineTick[] => {
  if (durationMs <= 0) {
    return [];
  }

  const ideal = Math.max(visibleWindowMs / TARGET_TICKS_PER_WINDOW, durationMs / MAX_TICKS);
  const interval = TICK_INTERVALS_MS.find((candidate) => candidate >= ideal) ?? TICK_INTERVALS_MS[TICK_INTERVALS_MS.length - 1];
  const majorEvery = interval < 5000 ? 5 : 2;

  const ticks: TimelineTick[] = [];
  for (let ms = 0, index = 0; ms <= durationMs; ms += interval, index++) {
    ticks.push({ ms, major: index % majorEvery === 0 });
  }
  return ticks;
};

export const lastAnnotationEndMs = (tiers: EafTier[]): number =>
  tiers.reduce((latest, tier) => tier.annotations.reduce((tierLatest, annotation) => Math.max(tierLatest, annotation.endMs), latest), 0);

/**
 * How wide the timeline runs. The host's duration is only a lower bound on it:
 * KD1-VU20180811SAN-03's host is a 15.8 s video, but the EAF was made against the
 * 20.1 s audio rendition and annotates out to 18.7 s. Taking the later of the two
 * keeps those annotations on the track, and covers the no-duration case for free.
 */
export const timelineDurationMs = (tiers: EafTier[], hostDurationMs?: number): number => Math.max(hostDurationMs ?? 0, lastAnnotationEndMs(tiers));
