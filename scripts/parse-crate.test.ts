import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCrate } from './parse-crate.ts';

const fixtures = join(import.meta.dirname, '..', 'fixtures');

const crate = (path: string, file = 'ro-crate-metadata.json') =>
  parseCrate(JSON.parse(readFileSync(join(fixtures, path, file), 'utf8')), path.split('/').pop() as string);

/** A crate the archive has not shipped, for cases no fixture exercises. */
const synthetic = (graph: unknown[], rootId = './') => ({
  '@context': ['https://w3id.org/ro/crate/1.2/context'],
  '@graph': [{ '@id': 'ro-crate-metadata.json', '@type': 'CreativeWork', about: { '@id': rootId } }, ...graph],
});

describe('parseCrate', () => {
  describe('a crate describing a whole collection', () => {
    const parsed = crate('VKS4');

    it('finds the collection, named for its directory when it states no identifier', () => {
      expect(parsed.collections).toEqual([expect.objectContaining({ id: 'VKS4', entityId: './', name: 'Example Collection' })]);
    });

    it('finds every object in the one crate', () => {
      expect(parsed.objects.map((object) => object.id)).toEqual(['VKS4-1_79', 'VKS4-2_16_46', 'VKS4-2_24_46', 'VKS4-2_25_46']);
    });

    it('assigns objects to the collection they share a crate with', () => {
      expect(parsed.objects.map((object) => object.collectionId)).toEqual(['VKS4', 'VKS4', 'VKS4', 'VKS4']);
    });

    it('reaches files through the container the object is the subject of', () => {
      expect(parsed.objects[0].files.map((file) => file.cratePath)).toEqual(['Sessions/VKS4-1_79/VKS4-1_79-A.wav', 'Sessions/VKS4-1_79/VKS4-1_79-B.wav']);
    });

    it('keeps the bare filename alongside the nested path', () => {
      expect(parsed.objects[0].files[0].filename).toBe('VKS4-1_79-A.wav');
    });

    it('drops the export tool’s own working files', () => {
      const paths = parsed.objects.flatMap((object) => object.files.map((file) => file.cratePath));
      expect(paths.some((path) => path.endsWith('.session'))).toBe(false);
      expect(paths.some((path) => path.endsWith('.sprj'))).toBe(false);
    });

    it('reports no warnings', () => {
      expect(parsed.warnings).toEqual([]);
    });
  });

  describe('a crate per object, as the archive publishes today', () => {
    it('takes ids from the archive’s own identifiers', () => {
      const parsed = crate('VKS3/026');
      expect(parsed.objects).toEqual([expect.objectContaining({ id: '026', collectionId: 'VKS3' })]);
    });

    it('resolves absolute file ids against the crate root', () => {
      const parsed = crate('VKS3/026');
      expect(parsed.objects[0].files.map((file) => file.cratePath)).toContain('VKS3-026-A.mp3');
    });

    it('reads membership from plain memberOf as well as pcdm:memberOf', () => {
      expect(crate('NT1/001').objects[0].collectionId).toBe('NT1');
      expect(crate('KD1/VU20180811SAN').objects[0].collectionId).toBe('KD1');
    });

    it('yields a collection and no objects for a collection-only crate', () => {
      const parsed = crate('VKS3');
      expect(parsed.collections.map((collection) => collection.id)).toEqual(['VKS3']);
      expect(parsed.objects).toEqual([]);
    });
  });

  describe('languages', () => {
    it('unions working and subject languages', () => {
      expect(crate('KD1/VU20180811SAN').objects[0].languages).toEqual(['Bislama', 'Vurës']);
    });

    it('drops the undetermined language, which carries no information', () => {
      const parsed = crate('VKS4');
      expect(parsed.collections[0].languages).toEqual([]);
      expect(parsed.objects[0].languages).toEqual(['Bislama']);
    });
  });

  describe('edge cases no fixture covers', () => {
    it('skips a file that sits outside the crate root', () => {
      const parsed = parseCrate(
        synthetic([
          {
            '@id': './',
            '@type': ['Dataset', 'RepositoryCollection'],
            name: 'Elsewhere',
          },
          {
            '@id': '#object',
            '@type': 'RepositoryObject',
            name: 'An object',
            hasPart: [{ '@id': 'https://example.org/offsite.wav' }, { '@id': 'local.wav' }],
          },
          { '@id': 'https://example.org/offsite.wav', '@type': 'File', encodingFormat: 'audio/wav' },
          { '@id': 'local.wav', '@type': 'File', encodingFormat: 'audio/wav' },
        ]),
        'Elsewhere',
      );

      expect(parsed.objects[0].files.map((file) => file.cratePath)).toEqual(['local.wav']);
      expect(parsed.warnings).toEqual(['File outside crate root, skipping: https://example.org/offsite.wav']);
    });

    it('percent-decodes a file id', () => {
      const parsed = parseCrate(
        synthetic([
          { '@id': './', '@type': ['Dataset', 'RepositoryCollection'], name: 'Spaces' },
          { '@id': '#object', '@type': 'RepositoryObject', name: 'An object', hasPart: [{ '@id': 'a%20file.wav' }] },
          { '@id': 'a%20file.wav', '@type': 'File', encodingFormat: 'audio/wav' },
        ]),
        'Spaces',
      );

      expect(parsed.objects[0].files[0].cratePath).toBe('a file.wav');
    });

    it('names an object after its directory when the crate root is the object', () => {
      const parsed = parseCrate(synthetic([{ '@id': './', '@type': ['Dataset', 'RepositoryObject'], name: 'Orphan' }]), 'LONELY');

      expect(parsed.objects[0].id).toBe('LONELY');
    });

    it('warns when an object names no collection at all', () => {
      const parsed = parseCrate(synthetic([{ '@id': './', '@type': ['Dataset', 'RepositoryObject'], name: 'Orphan' }]), 'LONELY');

      expect(parsed.objects[0].collectionId).toBe('LONELY');
      expect(parsed.warnings).toEqual(['Object ./ names no collection, falling back to LONELY']);
    });

    it('falls back to a unique id when two objects would collide', () => {
      const parsed = parseCrate(
        synthetic([
          { '@id': './', '@type': ['Dataset', 'RepositoryCollection'], name: 'Twins' },
          { '@id': '#one/same', '@type': 'RepositoryObject', name: 'First' },
          { '@id': '#two/same', '@type': 'RepositoryObject', name: 'Second' },
        ]),
        'Twins',
      );

      expect(parsed.objects.map((object) => object.id)).toEqual(['same', 'two-same']);
      expect(parsed.warnings).toEqual(['Duplicate object id same, falling back to two-same']);
    });
  });
});
