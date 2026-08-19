import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { EafTier } from '../lib/eaf';
import { formatTimecode } from '../lib/formatters';
import { timelineDurationMs, timelineTicks, VISIBLE_WINDOW_MS } from '../lib/timeline';

interface TranscriptTimelineProps {
  tiers: EafTier[];
  /** Absent when nothing playable annotates this transcript — no playhead, no seek. */
  currentTimeMs?: number;
  durationMs?: number;
  onSeek?: (ms: number) => void;
}

const TIER_LABEL_WIDTH = 140;
const TIER_ROW_HEIGHT = 40;
const RULER_HEIGHT = 32;
const PLAYHEAD_HEAD_HEIGHT = 7;
const MIN_ANNOTATION_WIDTH = 3;

/** Cycled per tier so a reader can tell tracks apart at a glance, as ELAN does. */
const TIER_COLOURS = [
  { block: 'border-blue-300 bg-blue-100 text-blue-900 hover:bg-blue-200', dot: 'bg-blue-400' },
  { block: 'border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200', dot: 'bg-amber-400' },
  { block: 'border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-200', dot: 'bg-emerald-400' },
  { block: 'border-rose-300 bg-rose-100 text-rose-900 hover:bg-rose-200', dot: 'bg-rose-400' },
  { block: 'border-violet-300 bg-violet-100 text-violet-900 hover:bg-violet-200', dot: 'bg-violet-400' },
  { block: 'border-orange-300 bg-orange-100 text-orange-900 hover:bg-orange-200', dot: 'bg-orange-400' },
  { block: 'border-teal-300 bg-teal-100 text-teal-900 hover:bg-teal-200', dot: 'bg-teal-400' },
  { block: 'border-pink-300 bg-pink-100 text-pink-900 hover:bg-pink-200', dot: 'bg-pink-400' },
];

export const TranscriptTimeline = ({ tiers, currentTimeMs, durationMs, onSeek }: TranscriptTimelineProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    setContainerWidth(container.clientWidth);
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const duration = useMemo(() => timelineDurationMs(tiers, durationMs), [tiers, durationMs]);
  const visibleWindowMs = Math.min(VISIBLE_WINDOW_MS, duration || VISIBLE_WINDOW_MS);
  const trackWidth = Math.max(containerWidth - TIER_LABEL_WIDTH, 1);
  const timelineWidth = duration > 0 ? (duration / visibleWindowMs) * trackWidth : trackWidth;
  const pxPerMs = duration > 0 ? timelineWidth / duration : 0;
  const ticks = useMemo(() => timelineTicks(duration, visibleWindowMs), [duration, visibleWindowMs]);

  const playheadPx = (currentTimeMs ?? 0) * pxPerMs;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || currentTimeMs === undefined) {
      return;
    }
    // Scroll only once the playhead leaves the window, and land it a third in, so
    // playback pans in steps rather than chasing the playhead pixel by pixel.
    const windowWidth = container.clientWidth - TIER_LABEL_WIDTH;
    if (playheadPx >= container.scrollLeft && playheadPx <= container.scrollLeft + windowWidth) {
      return;
    }
    const left = Math.max(0, playheadPx - windowWidth / 3);
    // Animating a pan of more than a window is worse than not animating it: each
    // `timeupdate` restarts the animation, so a seek across an 18-minute
    // recording takes seconds to land. Playback panning stays smooth.
    container.scrollTo({ left, behavior: Math.abs(left - container.scrollLeft) > windowWidth ? 'auto' : 'smooth' });
  }, [playheadPx, currentTimeMs]);

  const seekToPosition = (event: MouseEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ms = (event.clientX - bounds.left) / pxPerMs;
    if (onSeek && ms >= 0 && ms <= duration) {
      onSeek(ms);
    }
  };

  return (
    <div ref={scrollRef} className="relative max-h-[500px] overflow-auto rounded-lg border border-primary-200 bg-white">
      <div className="relative min-w-full" style={{ width: timelineWidth + TIER_LABEL_WIDTH }}>
        <div className="sticky top-0 z-30 flex border-b border-primary-200 bg-primary-50" style={{ height: RULER_HEIGHT }}>
          <div className="sticky left-0 z-30 shrink-0 border-r border-primary-200 bg-primary-50" style={{ width: TIER_LABEL_WIDTH }} />
          {/* A button, not a div, so the ruler needs no keyboard shim; activating it
              by keyboard reports x=0 and so seeks nowhere. */}
          <button type="button" className="relative block flex-1 cursor-crosshair" tabIndex={-1} aria-hidden="true" onClick={seekToPosition}>
            {ticks.map((tick) => (
              <div key={tick.ms} className="absolute top-0 bottom-0" style={{ left: tick.ms * pxPerMs }}>
                <div className={tick.major ? 'h-4.5 w-px bg-primary-400' : 'h-2.5 w-px bg-primary-300'} />
                {tick.major && (
                  // Centred on its tick, except the first — half of it would fall
                  // off the left edge of the track and be clipped away.
                  <span className={`absolute top-4 left-0 font-mono text-[10px] whitespace-nowrap text-primary-500 ${tick.ms === 0 ? '' : '-translate-x-1/2'}`}>
                    {formatTimecode(tick.ms)}
                  </span>
                )}
              </div>
            ))}
          </button>
        </div>

        {tiers.map((tier, tierIndex) => {
          const colour = TIER_COLOURS[tierIndex % TIER_COLOURS.length];
          const alternate = tierIndex % 2 === 1;
          return (
            <div key={tier.tierId} className={`flex border-b border-primary-100 ${alternate ? 'bg-primary-50' : 'bg-white'}`}>
              <div
                className={`sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r border-primary-200 px-2.5 ${alternate ? 'bg-primary-50' : 'bg-white'}`}
                style={{ width: TIER_LABEL_WIDTH, height: TIER_ROW_HEIGHT }}
              >
                <span className={`size-2 shrink-0 rounded-full ${colour.dot}`} />
                <span className="truncate font-mono text-[11px] font-medium text-primary-600" title={tier.tierId}>
                  {tier.tierId}
                </span>
              </div>

              <div className="relative flex-1" style={{ height: TIER_ROW_HEIGHT }}>
                {tier.annotations.map((annotation) => (
                  <button
                    key={annotation.id}
                    type="button"
                    // Hovering lifts the block above its neighbours and lets it grow
                    // past its own span: a 200 ms annotation is a few pixels wide otherwise.
                    className={`absolute top-1 bottom-1 flex items-center overflow-hidden rounded border px-1 text-left text-[11px] leading-none hover:z-10 hover:min-w-fit hover:shadow ${colour.block} ${onSeek ? 'cursor-pointer' : 'cursor-default'}`}
                    style={{ left: annotation.startMs * pxPerMs, width: Math.max((annotation.endMs - annotation.startMs) * pxPerMs, MIN_ANNOTATION_WIDTH) }}
                    title={`${formatTimecode(annotation.startMs)} – ${formatTimecode(annotation.endMs)}\n${annotation.value}`}
                    tabIndex={onSeek ? undefined : -1}
                    onClick={onSeek && (() => onSeek(annotation.startMs))}
                  >
                    <span className="truncate">{annotation.value}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {currentTimeMs !== undefined && (
          // Starts below the ruler rather than at the top: the ruler is sticky and
          // opaque, so a head drawn up there is simply covered over.
          <div className="pointer-events-none absolute inset-y-0 z-10 w-0" style={{ left: playheadPx + TIER_LABEL_WIDTH }}>
            <div className="absolute -left-[5px] size-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-red-600" style={{ top: RULER_HEIGHT }} />
            <div className="absolute bottom-0 left-0 w-[1.5px] -translate-x-[0.75px] bg-red-600" style={{ top: RULER_HEIGHT + PLAYHEAD_HEAD_HEIGHT }} />
          </div>
        )}
      </div>
    </div>
  );
};
