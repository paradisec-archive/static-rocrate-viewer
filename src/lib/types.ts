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
