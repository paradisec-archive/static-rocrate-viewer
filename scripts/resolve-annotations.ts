import type { CatalogFile } from '../src/lib/types';

/**
 * A `CatalogFile` plus the annotation links off its RO-Crate entity, flattened
 * to strings. A link is a bare filename or an `@id` URL, depending on whether
 * the referenced entity is in the crate's `@graph`.
 */
export interface LinkedFile extends Pick<CatalogFile, 'filename' | 'encodingFormat'> {
  annotationOf?: string[];
  hasAnnotation?: string[];
}

export interface AnnotationAssociation {
  eaf: string;
  /** The rendition the transcript attaches to; absent when nothing playable annotates it. */
  host?: string;
}

const eafFormat = 'application/eaf+xml';

const isEaf = (file: LinkedFile): boolean => file.filename.toLowerCase().endsWith('.eaf') || file.encodingFormat === eafFormat;

const stem = (filename: string): string => filename.replace(/\.[^./]+$/, '');

// Crate ids are absolute URLs (`http://catalog.paradisec.org.au/…/x.mp3`); a
// link resolved through an entity's name arrives bare.
const targetFilename = (ref: string): string => {
  const segment = ref.split(/[?#]/)[0].split('/').filter(Boolean).pop() ?? '';
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

/**
 * Host precedence, D9: video beats MP3 beats every other audio. This is a
 * generate-time ranking of renditions, deliberately separate from the
 * render-time `canPlayType()` check — Node cannot ask a browser what it plays.
 */
const renditionRank = (encodingFormat: string): number | undefined => {
  if (encodingFormat.startsWith('video/')) {
    return 0;
  }
  if (encodingFormat === 'audio/mpeg') {
    return 1;
  }
  if (encodingFormat.startsWith('audio/')) {
    return 2;
  }
  return undefined;
};

const bestRendition = (files: LinkedFile[]): LinkedFile | undefined => {
  let best: { file: LinkedFile; rank: number } | undefined;
  for (const file of files) {
    const rank = renditionRank(file.encodingFormat);
    if (rank === undefined) {
      continue;
    }
    if (!best || rank < best.rank || (rank === best.rank && file.filename.localeCompare(best.file.filename) < 0)) {
      best = { file, rank };
    }
  }
  return best?.file;
};

/**
 * Which files a given `.eaf` annotates, following D2's chain: the crate's
 * `annotationOf` / `hasAnnotation` links first, then a filename-stem match for
 * stale crates that carry neither. `MEDIA_DESCRIPTOR` is not in the chain (D17).
 */
const annotatedFiles = (eaf: LinkedFile, files: LinkedFile[]): LinkedFile[] => {
  const targets = new Set((eaf.annotationOf ?? []).map(targetFilename));
  for (const file of files) {
    if ((file.hasAnnotation ?? []).map(targetFilename).includes(eaf.filename)) {
      targets.add(file.filename);
    }
  }

  const linked = files.filter((file) => targets.has(file.filename));
  if (linked.length > 0) {
    return linked;
  }

  const eafStem = stem(eaf.filename);
  return files.filter((file) => file.filename !== eaf.filename && stem(file.filename) === eafStem);
};

/**
 * Decide, for each `.eaf` in an item, which rendition its transcript renders
 * beneath. An eaf annotates a *recording*, so the linked files only identify the
 * recording; the host is then the best rendition of that recording, whether or
 * not the crate linked it. Renditions that lose stay hostless and get a plain
 * player.
 *
 * `files` must already be filtered to what exists on disk — a crate routinely
 * lists renditions the archive did not ship.
 */
export const resolveAnnotations = (files: LinkedFile[]): AnnotationAssociation[] =>
  files
    .filter(isEaf)
    .map((eaf) => {
      const recordings = new Set(annotatedFiles(eaf, files).map((file) => stem(file.filename)));
      const host = bestRendition(files.filter((file) => recordings.has(stem(file.filename))));
      return { eaf: eaf.filename, host: host?.filename };
    })
    .sort((a, b) => a.eaf.localeCompare(b.eaf));
