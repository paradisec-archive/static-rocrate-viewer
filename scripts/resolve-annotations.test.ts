import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROCrate } from 'ro-crate';
import { describe, expect, it } from 'vitest';
import { type LinkedFile, resolveAnnotations } from './resolve-annotations.ts';

const fixtures = join(import.meta.dirname, '..', 'fixtures');
const eafFormat = 'application/eaf+xml';

/**
 * Build the resolver's input from a real crate the way the generator will:
 * every `hasPart` entry that exists on disk, with its links taken as raw `@id`
 * URLs — the harder of the two forms a crate hands back.
 */
const item = (path: string): LinkedFile[] => {
  const dir = join(fixtures, path);
  const json = JSON.parse(readFileSync(join(dir, 'ro-crate-metadata.json'), 'utf8'));
  const crate = new ROCrate(json, { array: true, link: true });
  const refs = (value: unknown): string[] | undefined =>
    Array.isArray(value) ? value.map((entity) => String((entity as Record<string, unknown>)['@id'])) : undefined;

  return (crate.rootDataset.hasPart as Record<string, unknown>[])
    .map((part) => ({
      filename: String((part.name as string[])[0]),
      encodingFormat: String((part.encodingFormat as string[])[0]),
      annotationOf: refs(part.annotationOf),
      hasAnnotation: refs(part.hasAnnotation),
    }))
    .filter((file) => existsSync(join(dir, file.filename)));
};

const file = (filename: string, encodingFormat: string, links: Partial<LinkedFile> = {}): LinkedFile => ({
  filename,
  encodingFormat,
  ...links,
});

describe('fixture crates', () => {
  it('follows annotationOf, and prefers video over the audio renditions', () => {
    // KD1-…-03 is annotated against .wav, .mp3 and .mp4; D9 makes the video win.
    expect(resolveAnnotations(item('KD1/VU20180811SAN'))).toEqual([
      { eaf: 'KD1-VU20180811SAN-01.eaf', host: 'KD1-VU20180811SAN-01.mp3' },
      { eaf: 'KD1-VU20180811SAN-02.eaf', host: 'KD1-VU20180811SAN-02.mp3' },
      { eaf: 'KD1-VU20180811SAN-03.eaf', host: 'KD1-VU20180811SAN-03.mp4' },
    ]);
  });

  it('falls back to a stem match on a crate with no annotation links', () => {
    // NT1/001 is the legacy fixture: no hasAnnotation, no annotationOf anywhere.
    const files = item('NT1/001');
    expect(files.some((f) => f.annotationOf || f.hasAnnotation)).toBe(false);
    expect(resolveAnnotations(files)).toEqual([{ eaf: 'NT1-001-001B.eaf', host: 'NT1-001-001B.mp3' }]);
  });

  it('finds nothing to associate in an item with no eaf', () => {
    expect(resolveAnnotations(item('VKS3/026'))).toEqual([]);
  });
});

describe('the link chain', () => {
  it('reads the link off the media entity when only that direction is present', () => {
    const files = [file('a.eaf', 'application/eaf+xml'), file('b.mp3', 'audio/mpeg', { hasAnnotation: ['http://example.org/repository/X/1/a.eaf'] })];
    expect(resolveAnnotations(files)).toEqual([{ eaf: 'a.eaf', host: 'b.mp3' }]);
  });

  it('accepts a link given as a bare filename as well as an @id URL', () => {
    // ro-crate resolves a link to the entity's name when it is in the @graph,
    // and to its @id when it is not.
    const files = [file('a.eaf', 'application/eaf+xml', { annotationOf: ['b.mp3'] }), file('b.mp3', 'audio/mpeg')];
    expect(resolveAnnotations(files)).toEqual([{ eaf: 'a.eaf', host: 'b.mp3' }]);
  });

  it('decodes a percent-escaped link', () => {
    const files = [
      file('a.eaf', 'application/eaf+xml', { annotationOf: ['http://example.org/repository/X/1/two%20words.mp3'] }),
      file('two words.mp3', 'audio/mpeg'),
    ];
    expect(resolveAnnotations(files)).toEqual([{ eaf: 'a.eaf', host: 'two words.mp3' }]);
  });

  it('prefers a link over a stem match, so a renamed eaf still lands on its media', () => {
    const files = [file('notes.eaf', 'application/eaf+xml', { annotationOf: ['rec.mp3'] }), file('rec.mp3', 'audio/mpeg'), file('notes.mp3', 'audio/mpeg')];
    expect(resolveAnnotations(files)).toEqual([{ eaf: 'notes.eaf', host: 'rec.mp3' }]);
  });

  it('ignores a link to a rendition the archive did not ship', () => {
    const files = [file('a.eaf', 'application/eaf+xml', { annotationOf: ['a.wav', 'a.mp3'] }), file('a.mp3', 'audio/mpeg')];
    expect(resolveAnnotations(files)).toEqual([{ eaf: 'a.eaf', host: 'a.mp3' }]);
  });
});

describe('host precedence', () => {
  it('picks the MP3 over other audio, whatever order the files arrive in', () => {
    const files = [file('a.wav', 'audio/vnd.wav'), file('a.eaf', 'application/eaf+xml'), file('a.mp3', 'audio/mpeg')];
    expect(resolveAnnotations(files)).toEqual([{ eaf: 'a.eaf', host: 'a.mp3' }]);
  });

  it('treats an unrecognised audio subtype as a rendition of last resort', () => {
    const files = [file('a.eaf', 'application/eaf+xml'), file('a.ogg', 'audio/ogg')];
    expect(resolveAnnotations(files)).toEqual([{ eaf: 'a.eaf', host: 'a.ogg' }]);
  });

  it('breaks a tie on filename, so the same crate always generates the same host', () => {
    const files = [file('a.eaf', 'application/eaf+xml'), file('a.wav', 'audio/wav'), file('a.flac', 'audio/flac')];
    expect(resolveAnnotations(files)).toEqual([{ eaf: 'a.eaf', host: 'a.flac' }]);
  });

  it('promotes an unlinked rendition of the same recording, since an eaf annotates a recording', () => {
    const files = [file('a.eaf', 'application/eaf+xml', { annotationOf: ['a.wav'] }), file('a.wav', 'audio/wav'), file('a.mp4', 'video/mp4')];
    expect(resolveAnnotations(files)).toEqual([{ eaf: 'a.eaf', host: 'a.mp4' }]);
  });
});

describe('what gets no host', () => {
  it('leaves an eaf standalone when nothing playable annotates it', () => {
    const files = [file('a.eaf', 'application/eaf+xml', { annotationOf: ['a.mxf'] }), file('a.mxf', 'application/mxf')];
    expect(resolveAnnotations(files)).toEqual([{ eaf: 'a.eaf', host: undefined }]);
  });

  it('leaves an eaf standalone when neither a link nor a stem finds any media', () => {
    const files = [file('orphan.eaf', 'application/eaf+xml'), file('rec.mp3', 'audio/mpeg')];
    expect(resolveAnnotations(files)).toEqual([{ eaf: 'orphan.eaf', host: undefined }]);
  });

  it('rescues the recording when the only linked file is not playable', () => {
    const files = [file('a.eaf', 'application/eaf+xml', { annotationOf: ['a.mxf'] }), file('a.mxf', 'application/mxf'), file('a.mp3', 'audio/mpeg')];
    expect(resolveAnnotations(files)).toEqual([{ eaf: 'a.eaf', host: 'a.mp3' }]);
  });
});

describe('several eafs', () => {
  it('gives each eaf of one recording the same host, to be stacked beneath it', () => {
    const files = [
      file('rec.mp3', 'audio/mpeg'),
      file('rec-words.eaf', 'application/eaf+xml', { annotationOf: ['rec.mp3'] }),
      file('rec-gloss.eaf', 'application/eaf+xml', { annotationOf: ['rec.mp3'] }),
    ];
    expect(resolveAnnotations(files)).toEqual([
      { eaf: 'rec-gloss.eaf', host: 'rec.mp3' },
      { eaf: 'rec-words.eaf', host: 'rec.mp3' },
    ]);
  });
});

describe('recognising an eaf', () => {
  it('identifies an eaf by extension when the crate mislabels its format', () => {
    const files = [file('a.eaf', 'text/xml'), file('a.mp3', 'audio/mpeg')];
    expect(resolveAnnotations(files)).toEqual([{ eaf: 'a.eaf', host: 'a.mp3' }]);
  });

  it('identifies an eaf by encodingFormat when the filename does not say so', () => {
    const files = [file('a.xml', eafFormat), file('a.mp3', 'audio/mpeg')];
    expect(resolveAnnotations(files)).toEqual([{ eaf: 'a.xml', host: 'a.mp3' }]);
  });
});
