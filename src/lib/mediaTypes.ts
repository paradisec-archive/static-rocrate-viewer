export type MediaKind = 'audio' | 'video' | 'image' | 'other';

/** Where a file renders on the item page. */
export type MediaSection = 'audio' | 'video' | 'image' | 'download';

// Images stay an allowlist: `image/tiff` is a real archive format and a label we
// want, but nothing renders it, so it must not reach an <img>.
const imageTypes = new Set(['image/jpeg', 'image/png']);

export const getMediaKind = (encodingFormat: string): MediaKind => {
  if (imageTypes.has(encodingFormat)) {
    return 'image';
  }
  if (encodingFormat.startsWith('video/')) {
    return 'video';
  }
  if (encodingFormat.startsWith('audio/')) {
    return 'audio';
  }
  return 'other';
};

// Browsers never adopted WAV's IANA spelling: Chrome and Firefox both answer ''
// for `audio/vnd.wav`, which is what PARADISEC's older records carry, while both
// accept `audio/wav`. Same bytes, different name — so this is a synonym table,
// not the format allowlist we are getting rid of.
const canonicalTypes: Record<string, string> = {
  'audio/vnd.wav': 'audio/wav',
  'audio/vnd.wave': 'audio/wav',
  'audio/wave': 'audio/wav',
  'audio/x-pn-wav': 'audio/wav',
};

const answers = new Map<string, boolean>();

/**
 * Ask the browser whether it can decode this format, rather than guessing from a
 * list that would rot against PARADISEC's long tail of legacy containers. The
 * answer differs between browsers — Firefox plays `video/quicktime`, Chrome does
 * not — which is the point: each one answers honestly for itself.
 */
const canPlay = (encodingFormat: string): boolean => {
  const kind = getMediaKind(encodingFormat);
  if (kind !== 'audio' && kind !== 'video') {
    return false;
  }

  const cached = answers.get(encodingFormat);
  if (cached !== undefined) {
    return cached;
  }

  const element = document.createElement(kind);
  const answer = element.canPlayType(canonicalTypes[encodingFormat] ?? encodingFormat) !== '';
  answers.set(encodingFormat, answer);
  return answer;
};

export const getMediaSection = (encodingFormat: string): MediaSection => {
  const kind = getMediaKind(encodingFormat);
  if (kind === 'image') {
    return 'image';
  }
  return (kind === 'audio' || kind === 'video') && canPlay(encodingFormat) ? kind : 'download';
};

// `audio/mpeg` is the only format whose derived name misleads: every archive MP3
// carries it, and 'MPEG Audio' reads like video.
const labels: Record<string, string> = {
  'audio/mpeg': 'MP3 Audio',
};

const suffixes: Record<string, string> = {
  audio: ' Audio',
  video: ' Video',
  image: ' Image',
};

export const getMediaLabel = (encodingFormat: string): string => {
  const known = labels[encodingFormat];
  if (known) {
    return known;
  }

  const [type, subtype] = encodingFormat.split('/');
  if (!subtype) {
    return encodingFormat;
  }

  const name = subtype
    .replace(/^(x-|vnd\.)/, '')
    .replace(/\+.*$/, '')
    .toUpperCase();
  return `${name}${suffixes[type] ?? ''}`;
};
