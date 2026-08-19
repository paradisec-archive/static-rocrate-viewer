import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { ROCrate } from 'ro-crate';
import type { Transcript, TranscriptIndex } from '../src/lib/eaf';
import type { Catalog, CatalogCollection, CatalogFile, CatalogItem } from '../src/lib/types';
import { parseEaf } from './parse-eaf.ts';
import { type LinkedFile, resolveAnnotations } from './resolve-annotations.ts';

const resolveStringValue = (val: unknown): string => {
  if (val == null) {
    return '';
  }

  if (typeof val === 'string') {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map(resolveStringValue).filter(Boolean).join(', ');
  }

  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    if (obj.name) {
      return resolveStringValue(obj.name);
    }

    if (obj['@id']) {
      return String(obj['@id']);
    }
  }

  return String(val);
};

const resolveStringArray = (val: unknown): string[] => {
  if (val == null) {
    return [];
  }

  const arr = Array.isArray(val) ? val : [val];

  return arr.map(resolveStringValue).filter(Boolean);
};

const findMetadataFile = (dir: string, prefix: string): string | undefined => {
  const candidates = [join(dir, 'ro-crate-metadata.json'), join(dir, `${prefix}-ro-crate-metadata.json`)];
  return candidates.find((p) => existsSync(p));
};

const findMetadataFiles = (dataDir: string): { metadataPath: string; collectionId: string; itemId: string }[] => {
  const results: {
    metadataPath: string;
    collectionId: string;
    itemId: string;
  }[] = [];

  if (!existsSync(dataDir)) {
    console.error(`Data directory not found: ${dataDir}`);
    process.exit(1);
  }

  for (const colDir of readdirSync(dataDir)) {
    const colPath = join(dataDir, colDir);
    if (!statSync(colPath).isDirectory()) {
      continue;
    }

    for (const itemDir of readdirSync(colPath)) {
      const itemPath = join(colPath, itemDir);
      if (!statSync(itemPath).isDirectory()) {
        continue;
      }

      const metadataPath = findMetadataFile(itemPath, itemDir);
      if (metadataPath) {
        results.push({
          metadataPath,
          collectionId: colDir,
          itemId: itemDir,
        });
      }
    }
  }

  return results;
};

const findDoi = (rootDataset: Record<string, unknown>): string | undefined => {
  const identifiers = rootDataset.identifier;
  if (!Array.isArray(identifiers)) {
    return undefined;
  }
  for (const id of identifiers) {
    if (typeof id === 'object' && id !== null) {
      const entity = id as Record<string, unknown>;
      const name = entity.name;
      if (name === 'doi' || (Array.isArray(name) && name.includes('doi'))) {
        return resolveStringValue(entity.value);
      }
    }
  }
  return undefined;
};

/**
 * Parse each `.eaf` in the item and file it under the path it renders beneath.
 * A file that will not parse is dropped with a warning rather than losing the
 * whole item — the archive's older annotation files are not all well-formed.
 */
const buildTranscripts = (files: CatalogFile[], links: LinkedFile[], itemDir: string): TranscriptIndex => {
  const byFilename = new Map(files.map((file) => [file.filename, file]));
  const index: TranscriptIndex = {};

  for (const { eaf, host } of resolveAnnotations(links)) {
    const eafFile = byFilename.get(eaf);
    const hostFile = host ? byFilename.get(host) : undefined;
    if (!eafFile) {
      continue;
    }

    let transcript: Transcript;
    try {
      transcript = {
        filename: eaf,
        path: eafFile.path,
        document: parseEaf(readFileSync(join(itemDir, eaf), 'utf-8')),
      };
    } catch (err) {
      console.error(`  Warning: could not parse ${eaf}: ${err}`);
      continue;
    }

    const key = (hostFile ?? eafFile).path;
    index[key] = [...(index[key] ?? []), transcript];
  }

  return index;
};

const processItem = (
  metadataPath: string,
  collectionId: string,
  itemId: string,
  dataDir: string,
): { item: CatalogItem; collectionName: string; rawJson: unknown; transcripts: TranscriptIndex } => {
  const json = JSON.parse(readFileSync(metadataPath, 'utf-8'));
  const crate = new ROCrate(json, { array: true, link: true });
  const root = crate.rootDataset;

  const title = resolveStringValue(root.name);
  const description = resolveStringValue(root.description);
  const dateCreated = resolveStringValue(root.dateCreated);
  const doi = findDoi(root as Record<string, unknown>);
  const languages = resolveStringArray(root.inLanguage);
  const countries = resolveStringArray(root.countries);

  // Derive collection name from memberOf in raw JSON
  // (link: true may strip inline properties when the entity isn't in @graph)
  let collectionName = collectionId;
  const graph = (json as Record<string, unknown>)['@graph'] as unknown[];
  if (Array.isArray(graph)) {
    const rawRoot = graph.find((e) => typeof e === 'object' && e !== null && (e as Record<string, unknown>)['@id'] === root['@id']) as
      | Record<string, unknown>
      | undefined;
    if (rawRoot?.memberOf) {
      const rawMemberOf = rawRoot.memberOf as Record<string, unknown>;
      const name = rawMemberOf.name;
      if (typeof name === 'string' && name) {
        collectionName = name;
      }
    }
  }

  // Process files
  const files: CatalogFile[] = [];
  const links: LinkedFile[] = [];
  const hasPart = root.hasPart;
  if (Array.isArray(hasPart)) {
    for (const part of hasPart) {
      if (typeof part !== 'object' || part === null) {
        continue;
      }
      const fileEntity = part as Record<string, unknown>;

      // Get filename from the entity
      const filename = resolveStringValue(fileEntity.filename) || resolveStringValue(fileEntity.name) || '';
      if (!filename) {
        continue;
      }

      // Check if file exists on disk (relative to item directory)
      const filePath = join(dataDir, collectionId, itemId, filename);
      if (!existsSync(filePath)) {
        console.error(`Warning: File not found, skipping: ${filePath}`);
        continue;
      }

      const relativePath = `${basename(dataDir)}/${collectionId}/${itemId}/${filename}`;
      const encodingFormat = resolveStringValue(fileEntity.encodingFormat);
      const contentSize = Number(fileEntity.contentSize) || 0;
      const duration = fileEntity.duration != null ? Number(fileEntity.duration) : undefined;
      const fileDoi = resolveStringValue(fileEntity.doi) || undefined;

      files.push({
        filename,
        path: relativePath,
        encodingFormat,
        contentSize,
        duration,
        doi: fileDoi,
      });

      links.push({
        filename,
        encodingFormat,
        annotationOf: resolveStringArray(fileEntity.annotationOf),
        hasAnnotation: resolveStringArray(fileEntity.hasAnnotation),
      });
    }
  }

  return {
    item: {
      id: itemId,
      collectionId,
      title,
      description,
      dateCreated,
      doi,
      languages,
      countries,
      files,
    },
    collectionName,
    rawJson: json,
    transcripts: buildTranscripts(files, links, join(dataDir, collectionId, itemId)),
  };
};

interface CollectionMeta {
  name: string;
  description?: string;
  dateCreated?: string;
  doi?: string;
  languages: string[];
  countries: string[];
  rawJson: unknown;
}

const processCollectionMetadata = (dataDir: string): Map<string, CollectionMeta> => {
  const results = new Map<string, CollectionMeta>();

  for (const colDir of readdirSync(dataDir)) {
    const colPath = join(dataDir, colDir);
    if (!statSync(colPath).isDirectory()) {
      continue;
    }

    const metadataPath = findMetadataFile(colPath, colDir);
    if (!metadataPath) {
      continue;
    }

    try {
      const json = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      const crate = new ROCrate(json, { array: true, link: true });
      const root = crate.rootDataset;

      results.set(colDir, {
        name: resolveStringValue(root.name) || colDir,
        description: resolveStringValue(root.description) || undefined,
        dateCreated: resolveStringValue(root.dateCreated) || undefined,
        doi: findDoi(root as Record<string, unknown>),
        languages: resolveStringArray(root.inLanguage),
        countries: resolveStringArray(root.countries),
        rawJson: json,
      });

      console.error(`  Found collection metadata: ${colDir}`);
    } catch (err) {
      console.error(`  Error reading collection metadata ${metadataPath}: ${err}`);
    }
  }

  return results;
};

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
  mkdirSync(outputDir, { recursive: true });

  console.error(`Scanning ${dataDir} for RO-Crate metadata...`);

  // Process collection-level metadata
  const collectionMeta = processCollectionMetadata(dataDir);

  const metadataFiles = findMetadataFiles(dataDir);
  if (metadataFiles.length === 0) {
    console.error('No RO-Crate metadata files found');
    process.exit(1);
  }

  console.error(`Found ${metadataFiles.length} items`);

  // Process all items
  const collectionItemsMap = new Map<string, CatalogItem[]>();
  const rocrateData: Record<string, unknown> = {};
  const transcripts: TranscriptIndex = {};

  // Store collection-level ro-crate data
  for (const [colId, meta] of collectionMeta) {
    rocrateData[colId] = meta.rawJson;
  }

  for (const { metadataPath, collectionId, itemId } of metadataFiles) {
    try {
      const { item, collectionName, rawJson, transcripts: itemTranscripts } = processItem(metadataPath, collectionId, itemId, dataDir);

      if (!collectionItemsMap.has(collectionId)) {
        collectionItemsMap.set(collectionId, []);
        // If no collection-level metadata, create a fallback from item's memberOf
        if (!collectionMeta.has(collectionId)) {
          collectionMeta.set(collectionId, {
            name: collectionName,
            languages: [],
            countries: [],
            rawJson: null,
          });
        }
      }
      collectionItemsMap.get(collectionId)?.push(item);

      rocrateData[`${collectionId}/${itemId}`] = rawJson;
      Object.assign(transcripts, itemTranscripts);

      console.error(`  Processed ${collectionId}/${itemId}: ${item.title} (${item.files.length} files)`);
    } catch (err) {
      console.error(`  Error processing ${metadataPath}: ${err}`);
    }
  }

  // Build catalog
  const collections: CatalogCollection[] = Array.from(collectionItemsMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, items]) => {
      const meta = collectionMeta.get(id);
      return {
        id,
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

  // Write catalog.js
  const catalogJs = `window.__ROCRATE_VIEWER_CATALOG__ = ${JSON.stringify(catalog, null, 2)};\n`;
  writeFileSync(join(outputDir, 'catalog.js'), catalogJs);
  console.error(`Wrote catalog.js (${collections.length} collections, ${metadataFiles.length} items)`);

  // Write rocrate-data.js
  const rocrateJs = `window.__ROCRATE_VIEWER_DATA__ = ${JSON.stringify(rocrateData)};\n`;
  writeFileSync(join(outputDir, 'rocrate-data.js'), rocrateJs);
  console.error(`Wrote rocrate-data.js (${Object.keys(rocrateData).length} entries)`);

  // Its own file, not part of catalog.js: a transcript dwarfs the metadata that
  // every page needs, and the item page is the only thing that reads it.
  const transcriptsJs = `window.__ROCRATE_VIEWER_TRANSCRIPTS__ = ${JSON.stringify(transcripts)};\n`;
  writeFileSync(join(outputDir, 'transcripts.js'), transcriptsJs);
  const transcriptCount = Object.values(transcripts).reduce((total, list) => total + list.length, 0);
  console.error(`Wrote transcripts.js (${transcriptCount} transcripts on ${Object.keys(transcripts).length} files)`);

  console.error('Done!');
};

main();
