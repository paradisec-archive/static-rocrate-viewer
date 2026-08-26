import { ROCrate } from 'ro-crate';
import { asList, identifierValue, resolveValue, resolveValueList } from '../src/lib/roCrateValue.ts';

/**
 * A crate yields collections and objects, whatever shape it arrived in. A crate
 * per object (one collection entity, or none, plus one object) and a single
 * crate describing a whole collection are the same walk over `@graph`; the
 * former is just the case where the graph holds one object and no files below
 * the root.
 */

export interface CrateFile {
  filename: string;
  /** Percent-decoded, relative to the crate root. Nested when the crate nests. */
  cratePath: string;
  encodingFormat: string;
  contentSize: number;
  duration?: number;
  doi?: string;
  annotationOf: string[];
  hasAnnotation: string[];
}

interface CrateObject {
  id: string;
  entityId: string;
  collectionId: string;
  /** Names a collection that may have no crate of its own, so we can stub it. */
  collectionName?: string;
  title: string;
  description: string;
  dateCreated: string;
  doi?: string;
  languages: string[];
  countries: string[];
  files: CrateFile[];
}

export interface CrateCollection {
  id: string;
  entityId: string;
  name: string;
  description?: string;
  dateCreated?: string;
  doi?: string;
  languages: string[];
  countries: string[];
}

export interface ParsedCrate {
  collections: CrateCollection[];
  objects: CrateObject[];
  warnings: string[];
}

type Entity = Record<string, unknown>;

const lametaFormat = /^application\/lameta-/;

/** Set when lameta could not determine a language; carries no information. */
const undeterminedLanguage = 'und';

const isEntity = (value: unknown): value is Entity => typeof value === 'object' && value !== null;

const hasType = (entity: Entity, type: string): boolean => asList(entity['@type']).includes(type);

/**
 * Union of working and subject languages, minus `und`. Both properties are read
 * because a crate may state only one, and lameta states `und` in both when the
 * depositor never set a working language — surfacing that as a language would
 * fill the collection card and the search index with "Undetermined".
 */
const resolveLanguages = (entity: Entity): string[] => {
  const named = [...asList(entity.inLanguage), ...asList(entity['ldac:subjectLanguage'])]
    .filter((language) => {
      if (!isEntity(language)) {
        return true;
      }
      const code = resolveValue(language.code);
      const id = String(language['@id'] ?? '');
      return code !== undeterminedLanguage && !id.endsWith(`/${undeterminedLanguage}`);
    })
    .map(resolveValue)
    .filter(Boolean);

  return [...new Set(named)];
};

/** `http://…/VKS3/026` → `026`; `#session-VKS4-1_79` → `session-VKS4-1_79`; `./` → ``. */
const lastSegment = (id: string): string => {
  const trimmed = id.replace(/^#/, '');
  if (trimmed === './' || trimmed === '.' || trimmed === '') {
    return '';
  }
  return trimmed.split(/[?#]/)[0].split('/').filter(Boolean).pop() ?? '';
};

const decodeSafely = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const slug = (value: string): string => value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * Where a file sits relative to the crate root. Old crates give files absolute
 * `@id`s under the root's own absolute `@id`; lameta gives them plain relative
 * paths against a root of `./`. Both reduce to the same crate-relative path.
 */
const relativeToRoot = (fileId: string, rootId: string): string | undefined => {
  if (rootId === './' || rootId === '.' || rootId === '') {
    return /^[a-z][a-z0-9+.-]*:/i.test(fileId) ? undefined : decodeSafely(fileId);
  }

  const base = rootId.endsWith('/') ? rootId : `${rootId}/`;
  return fileId.startsWith(base) ? decodeSafely(fileId.slice(base.length)) : undefined;
};

/**
 * lameta's `.session` files sit in the very container that holds the recordings,
 * so reachability cannot tell them apart from content — only the vendor media
 * type can. Its `.sprj` needs no filtering: that hangs off the collection root,
 * which no object ever walks.
 */
const parseFile = (entity: Entity, rootId: string): CrateFile | undefined => {
  const encodingFormat = resolveValue(entity.encodingFormat);
  if (lametaFormat.test(encodingFormat)) {
    return undefined;
  }

  const cratePath = relativeToRoot(String(entity['@id'] ?? ''), rootId);
  if (!cratePath) {
    return undefined;
  }

  return {
    filename: cratePath.split('/').pop() ?? cratePath,
    cratePath,
    encodingFormat,
    contentSize: Number(entity.contentSize) || 0,
    duration: entity.duration != null ? Number(entity.duration) : undefined,
    doi: resolveValue(entity.doi) || undefined,
    annotationOf: resolveValueList(entity.annotationOf),
    hasAnnotation: resolveValueList(entity.hasAnnotation),
  };
};

/**
 * An object's files are its own `hasPart` plus the `hasPart` of any `Dataset` it
 * points at through `subjectOf`. lameta splits the two — the object carries the
 * description, a sibling `Dataset` carries the files — where older crates put
 * both on the one entity.
 */
const objectFiles = (object: Entity, rootId: string, warnings: string[]): CrateFile[] => {
  const parts = [...asList(object.hasPart), ...datasetContainers(object).flatMap((container) => asList(container.hasPart))];

  const files = new Map<string, CrateFile>();
  for (const part of parts) {
    if (!isEntity(part) || !hasType(part, 'File')) {
      continue;
    }
    const file = parseFile(part, rootId);
    if (!file) {
      if (!lametaFormat.test(resolveValue(part.encodingFormat))) {
        warnings.push(`File outside crate root, skipping: ${String(part['@id'])}`);
      }
      continue;
    }
    files.set(file.cratePath, file);
  }

  return [...files.values()];
};

/** Where lameta keeps an object's files. */
const datasetContainers = (object: Entity): Entity[] =>
  asList(object.subjectOf).filter((entity): entity is Entity => isEntity(entity) && hasType(entity, 'Dataset'));

const memberOfEntity = (object: Entity): Entity | undefined => {
  const member = asList(object['pcdm:memberOf'])[0] ?? asList(object.memberOf)[0];
  return isEntity(member) ? member : undefined;
};

const collectionId = (collection: Entity, dirName: string): string =>
  identifierValue(collection, 'collectionIdentifier') || slug(lastSegment(String(collection['@id'] ?? ''))) || dirName;

/**
 * The object's id, which becomes its URL segment. `itemIdentifier` first so that
 * every crate the archive already publishes keeps the id it has today; then the
 * directory its files live in, which is what lameta names after the object; then
 * the `@id` itself.
 */
const objectId = (object: Entity, dirName: string): string => {
  const stated = identifierValue(object, 'itemIdentifier');
  if (stated) {
    return slug(stated);
  }

  const containerName = datasetContainers(object)
    .map((container) => lastSegment(String(container['@id'] ?? '')))
    .find(Boolean);

  // A crate whose root is itself the object has an `@id` of `./`, which names nothing.
  return slug(containerName || lastSegment(String(object['@id'] ?? ''))) || dirName;
};

export const parseCrate = (json: unknown, dirName: string): ParsedCrate => {
  const warnings: string[] = [];
  const crate = new ROCrate(json, { array: true, link: true });
  const rootId = String(crate.rootDataset['@id'] ?? '');

  const entities = [...crate.entities()] as unknown as Entity[];

  const collections: CrateCollection[] = entities
    .filter((entity) => hasType(entity, 'RepositoryCollection'))
    .map((entity) => ({
      id: collectionId(entity, dirName),
      entityId: String(entity['@id']),
      name: resolveValue(entity.name) || dirName,
      description: resolveValue(entity.description) || undefined,
      dateCreated: resolveValue(entity.dateCreated) || undefined,
      doi: identifierValue(entity, 'doi'),
      languages: resolveLanguages(entity),
      countries: resolveValueList(entity.countries),
    }));

  const soleCollection = collections.length === 1 ? collections[0].id : undefined;

  const seen = new Set<string>();
  const objects: CrateObject[] = [];

  for (const entity of entities) {
    if (!hasType(entity, 'RepositoryObject')) {
      continue;
    }

    let id = objectId(entity, dirName);
    if (seen.has(id)) {
      const unique = slug(String(entity['@id']));
      warnings.push(`Duplicate object id ${id}, falling back to ${unique}`);
      id = unique;
    }
    seen.add(id);

    const member = memberOfEntity(entity);

    let collection = identifierValue(entity, 'collectionIdentifier') || soleCollection;
    if (!collection) {
      warnings.push(`Object ${String(entity['@id'])} names no collection, falling back to ${dirName}`);
      collection = dirName;
    }

    objects.push({
      id,
      entityId: String(entity['@id']),
      collectionId: collection,
      collectionName: member ? resolveValue(member.name) || undefined : undefined,
      title: resolveValue(entity.name),
      description: resolveValue(entity.description),
      dateCreated: resolveValue(entity.dateCreated),
      doi: identifierValue(entity, 'doi'),
      languages: resolveLanguages(entity),
      countries: resolveValueList(entity.countries),
      files: objectFiles(entity, rootId, warnings),
    });
  }

  return { collections, objects, warnings };
};
