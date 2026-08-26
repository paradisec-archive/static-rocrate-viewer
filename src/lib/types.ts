export interface CatalogFile {
  filename: string;
  path: string;
  encodingFormat: string;
  contentSize: number;
  duration?: number;
  doi?: string;
}

export interface CatalogItem {
  id: string;
  collectionId: string;
  /** Which crate in `rocrate-data.js` describes this item, and which entity in it. */
  crateKey: string;
  entityId: string;
  title: string;
  description: string;
  dateCreated: string;
  doi?: string;
  languages: string[];
  countries: string[];
  files: CatalogFile[];
}

export interface CatalogCollection {
  id: string;
  /** Absent when no crate describes the collection and it was stubbed from its items. */
  crateKey?: string;
  entityId?: string;
  name: string;
  description?: string;
  dateCreated?: string;
  doi?: string;
  languages: string[];
  countries: string[];
  items: CatalogItem[];
}

export interface Catalog {
  generated: string;
  collections: CatalogCollection[];
}
