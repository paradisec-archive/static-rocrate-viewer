import { useState } from 'react';
import { useTranscripts } from '../hooks/useTranscripts';
import { getMediaSection } from '../lib/mediaTypes';
import type { CatalogFile } from '../lib/types';
import { AudioPlayer } from './AudioPlayer';
import type { MediaSync } from './mediaSync';
import { TranscriptView } from './TranscriptView';
import { VideoPlayer } from './VideoPlayer';

/** A playable file and the transcripts that annotate it, kept in step with each other. */
export const MediaBlock = ({ file }: { file: CatalogFile }) => {
  const { data: transcripts } = useTranscripts();
  const [media, setMedia] = useState<HTMLMediaElement | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);

  const blocks = transcripts?.[file.path] ?? [];
  const Player = getMediaSection(file.encodingFormat) === 'video' ? VideoPlayer : AudioPlayer;

  // Only wire the player up when something is listening: `timeupdate` fires
  // several times a second, and a player with no transcript should stay inert.
  const sync: MediaSync | undefined =
    blocks.length > 0
      ? {
          ref: setMedia,
          onTimeUpdate: (event) => setCurrentTimeMs(event.currentTarget.currentTime * 1000),
        }
      : undefined;

  const seek = (ms: number) => {
    if (media) {
      media.currentTime = ms / 1000;
    }
  };

  return (
    <div className="space-y-3">
      <Player src={file.path} filename={file.filename} sync={sync} />
      {blocks.map((transcript) => (
        <TranscriptView key={transcript.path} transcript={transcript} currentTimeMs={currentTimeMs} onSeek={seek} />
      ))}
    </div>
  );
};
