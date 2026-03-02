import { Link } from '@tanstack/react-router';
import type { CatalogCollection } from '../lib/types';

export function CollectionCard({
  collection,
}: {
  collection: CatalogCollection;
}) {
  const fileCount = collection.items.reduce(
    (sum, item) => sum + item.files.length,
    0,
  );

  return (
    <Link
      to="/collections/$collectionId"
      params={{ collectionId: collection.id }}
      className="block rounded-lg border border-primary-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <h2 className="text-lg font-semibold text-primary-900">
        {collection.id}
      </h2>
      <p className="mt-1 text-sm text-primary-600">{collection.name}</p>
      {collection.description && (
        <p className="mt-1 line-clamp-2 text-xs text-primary-400">
          {collection.description}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-primary-500">
        <span>{collection.items.length} items</span>
        <span>{fileCount} files</span>
        {collection.languages.length > 0 && (
          <span>
            {collection.languages.slice(0, 3).join(', ')}
            {collection.languages.length > 3 ? '…' : ''}
          </span>
        )}
        {collection.countries.length > 0 && (
          <span>{collection.countries.join(', ')}</span>
        )}
      </div>
    </Link>
  );
}
