import type { ReactEventHandler } from 'react';

/**
 * What a player hands upward so a transcript can follow it. The ref is a
 * callback rather than a `RefObject` so one type serves both `<audio>` and
 * `<video>`, whose element types differ.
 */
export interface MediaSync {
  ref: (element: HTMLMediaElement | null) => void;
  onTimeUpdate: ReactEventHandler<HTMLMediaElement>;
}
