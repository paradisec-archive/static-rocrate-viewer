import Fuse from 'fuse.js';
import { useMemo } from 'react';
import type { CatalogItem } from '../lib/types';
import { useCatalog } from './useCatalog';

interface SearchItem extends CatalogItem {
  collectionName: string;
}

export const useSearch = (query: string) => {
  const { data: catalog } = useCatalog();

  const { fuse, items } = useMemo(() => {
    if (!catalog) return { fuse: null, items: [] };

    const searchItems: SearchItem[] = catalog.collections.flatMap((col) =>
      col.items.map((item) => ({
        ...item,
        collectionName: col.name,
      })),
    );

    const fuseInstance = new Fuse(searchItems, {
      keys: [
        { name: 'title', weight: 2 },
        { name: 'description', weight: 1 },
        { name: 'collectionName', weight: 1 },
        { name: 'languages', weight: 1 },
        { name: 'countries', weight: 1 },
        { name: 'files.filename', weight: 0.5 },
      ],
      // threshold: 0.3,
      includeMatches: true,
    });

    return { fuse: fuseInstance, items: searchItems };
  }, [catalog]);

  const results = useMemo(() => {
    if (!fuse || !query.trim()) return items;
    return fuse.search(query).map((r) => r.item);
  }, [fuse, items, query]);

  return { results, isReady: !!catalog };
};
