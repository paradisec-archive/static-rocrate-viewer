import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import type { Transcript, TranscriptIndex } from '../src/lib/eaf';
import type { Catalog, CatalogCollection, CatalogFile, CatalogItem } from '../src/lib/types';
import { type CrateCollection, type CrateFile, parseCrate } from './parse-crate.ts';
import { parseEaf } from './parse-eaf.ts';
import { resolveAnnotations } from './resolve-annotations.ts';

const isMetadataFile = (name: string): boolean => name === 'ro-crate-metadata.json' || name.endsWith('-ro-crate-metadata.json');

/**
 * Every crate under the data directory, one per directory. Which crates hold
 * collections and which hold objects is the crate's business, not the
 * directory's, so the walk goes all the way down and lets `parseCrate` decide.
 */
const findCrates = (dir: string): string[] => {
  const nested: string[] = [];
  const metadata: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      nested.push(...findCrates(path));
    } else if (isMetadataFile(entry.name)) {
      metadata.push(path);
    }
  }

  const preferred = metadata.find((path) => basename(path) === 'ro-crate-metadata.json') ?? metadata[0];
  return preferred ? [preferred, ...nested] : nested;
};

const urlPath = (...segments: string[]): string =>
  segments
    .filter(Boolean)
    .flatMap((segment) => segment.split(/[\\/]/))
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');

interface DiskFile {
  file: CrateFile;
  catalog: CatalogFile;
  diskPath: string;
}

/**
 * Parse each `.eaf` in the object and file it under the path it renders beneath.
 * A file that will not parse is dropped with a warning rather than losing the
 * whole object — the archive's older annotation files are not all well-formed.
 */
const buildTranscripts = (files: DiskFile[]): TranscriptIndex => {
  const byFilename = new Map(files.map((file) => [file.catalog.filename, file]));
  const index: TranscriptIndex = {};

  for (const { eaf, host } of resolveAnnotations(files.map((entry) => entry.file))) {
    const eafFile = byFilename.get(eaf);
    const hostFile = host ? byFilename.get(host) : undefined;
    if (!eafFile) {
      continue;
    }

    let transcript: Transcript;
    try {
      transcript = {
        filename: eaf,
        path: eafFile.catalog.path,
        document: parseEaf(readFileSync(eafFile.diskPath, 'utf-8')),
      };
    } catch (err) {
      console.error(`  Warning: could not parse ${eaf}: ${err}`);
      continue;
    }

    const key = (hostFile ?? eafFile).catalog.path;
    index[key] = [...(index[key] ?? []), transcript];
  }

  return index;
};

/** A crate lists renditions the archive did not ship; only shipped files count. */
const toDiskFiles = (files: CrateFile[], crateDir: string, pathPrefix: string[]): DiskFile[] => {
  const present: DiskFile[] = [];

  for (const file of files) {
    const diskPath = join(crateDir, ...file.cratePath.split('/'));
    if (!existsSync(diskPath)) {
      console.error(`Warning: File not found, skipping: ${diskPath}`);
      continue;
    }

    present.push({
      file,
      catalog: {
        filename: file.filename,
        path: urlPath(...pathPrefix, file.cratePath),
        encodingFormat: file.encodingFormat,
        contentSize: file.contentSize,
        duration: file.duration,
        doi: file.doi,
      },
      diskPath,
    });
  }

  return present;
};

interface CollectionMeta extends CrateCollection {
  crateKey?: string;
}

interface HarvestedItem {
  crateKey: string;
  item: CatalogItem;
  files: DiskFile[];
}

/** A crate deeper in the tree describes an object more specifically than one above it. */
const crateDepth = (crateKey: string): number => (crateKey === '.' ? 0 : crateKey.split('/').length);

const main = () => {
  const args = process.argv.slice(2);
  let dataDir = './data';
  let outputDir = './public';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--data-dir' && args[i + 1]) {
      dataDir = args[i + 1];
      i++;
    } else if (args[i] === '--output-dir' && args[i + 1]) {
      outputDir = args[i + 1];
      i++;
    }
  }

  dataDir = resolve(dataDir);
  outputDir = resolve(outputDir);

  if (!existsSync(dataDir)) {
    console.error(`Data directory not found: ${dataDir}`);
    process.exit(1);
  }

  mkdirSync(outputDir, { recursive: true });

  console.error(`Scanning ${dataDir} for RO-Crate metadata...`);

  const cratePaths = findCrates(dataDir);
  if (cratePaths.length === 0) {
    console.error('No RO-Crate metadata files found');
    process.exit(1);
  }

  console.error(`Found ${cratePaths.length} crates`);

  const collectionMeta = new Map<string, CollectionMeta>();
  const collectionItems = new Map<string, CatalogItem[]>();
  const rocrateData: Record<string, unknown> = {};
  const transcripts: TranscriptIndex = {};
  const dataDirName = basename(dataDir);
  const harvested = new Map<string, HarvestedItem>();

  for (const cratePath of cratePaths) {
    const crateDir = join(cratePath, '..');
    const relativeDir = relative(dataDir, crateDir);
    const crateKey = relativeDir.split(sep).filter(Boolean).join('/') || '.';

    try {
      const json = JSON.parse(readFileSync(cratePath, 'utf-8'));
      const { collections, objects, warnings } = parseCrate(json, basename(crateDir));

      for (const warning of warnings) {
        console.error(`  Warning: ${warning}`);
      }

      if (collections.length === 0 && objects.length === 0) {
        console.error(`  Warning: no collections or objects in ${cratePath}, skipping`);
        continue;
      }

      rocrateData[crateKey] = json;

      for (const collection of collections) {
        collectionMeta.set(collection.id, { ...collection, crateKey });
        console.error(`  Found collection: ${collection.id} (${collection.name})`);
      }

      for (const object of objects) {
        const files = toDiskFiles(object.files, crateDir, [dataDirName, relativeDir]);

        const item: CatalogItem = {
          id: object.id,
          collectionId: object.collectionId,
          crateKey,
          entityId: object.entityId,
          title: object.title,
          description: object.description,
          dateCreated: object.dateCreated,
          doi: object.doi,
          languages: object.languages,
          countries: object.countries,
          files: files.map((file) => file.catalog),
        };

        // Two crates may describe the same object; the deeper one is the more specific.
        const key = `${object.collectionId}/${object.id}`;
        const existing = harvested.get(key);
        if (existing) {
          const keep = crateDepth(existing.crateKey) >= crateDepth(crateKey) ? existing.crateKey : crateKey;
          console.error(`  Warning: ${key} described by both ${existing.crateKey} and ${crateKey}, keeping ${keep}`);
          if (keep !== crateKey) {
            continue;
          }
        }
        harvested.set(key, { crateKey, item, files });

        // A collection the objects name but no crate describes still gets a card.
        if (!collectionMeta.has(object.collectionId)) {
          collectionMeta.set(object.collectionId, {
            id: object.collectionId,
            entityId: object.collectionId,
            name: object.collectionName ?? object.collectionId,
            languages: [],
            countries: [],
          });
        }

        console.error(`  Processed ${key}: ${object.title} (${item.files.length} files)`);
      }
    } catch (err) {
      console.error(`  Error processing ${cratePath}: ${err}`);
    }
  }

  for (const { item, files } of harvested.values()) {
    if (!collectionItems.has(item.collectionId)) {
      collectionItems.set(item.collectionId, []);
    }
    collectionItems.get(item.collectionId)?.push(item);
    Object.assign(transcripts, buildTranscripts(files));
  }

  const collections: CatalogCollection[] = Array.from(collectionItems.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, items]) => {
      const meta = collectionMeta.get(id);
      return {
        id,
        crateKey: meta?.crateKey,
        entityId: meta?.entityId,
        name: meta?.name ?? id,
        description: meta?.description,
        dateCreated: meta?.dateCreated,
        doi: meta?.doi,
        languages: meta?.languages ?? [],
        countries: meta?.countries ?? [],
        items: items.sort((a, b) => a.id.localeCompare(b.id)),
      };
    });

  const catalog: Catalog = {
    generated: new Date().toISOString(),
    collections,
  };

  const catalogJs = `window.__ROCRATE_VIEWER_CATALOG__ = ${JSON.stringify(catalog, null, 2)};\n`;
  writeFileSync(join(outputDir, 'catalog.js'), catalogJs);
  console.error(`Wrote catalog.js (${collections.length} collections, ${harvested.size} items)`);

  const rocrateJs = `window.__ROCRATE_VIEWER_DATA__ = ${JSON.stringify(rocrateData)};\n`;
  writeFileSync(join(outputDir, 'rocrate-data.js'), rocrateJs);
  console.error(`Wrote rocrate-data.js (${Object.keys(rocrateData).length} crates)`);

  // Its own file, not part of catalog.js: a transcript dwarfs the metadata that
  // every page needs, and the item page is the only thing that reads it.
  const transcriptsJs = `window.__ROCRATE_VIEWER_TRANSCRIPTS__ = ${JSON.stringify(transcripts)};\n`;
  writeFileSync(join(outputDir, 'transcripts.js'), transcriptsJs);
  const transcriptCount = Object.values(transcripts).reduce((total, list) => total + list.length, 0);
  console.error(`Wrote transcripts.js (${transcriptCount} transcripts on ${Object.keys(transcripts).length} files)`);

  console.error('Done!');
};

main();
