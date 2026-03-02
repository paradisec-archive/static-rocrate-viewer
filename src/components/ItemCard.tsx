import { Link } from '@tanstack/react-router';
import { formatDate } from '../lib/formatters';
import type { CatalogItem } from '../lib/types';

export function ItemCard({ item }: { item: CatalogItem }) {
  return (
    <Link
      to="/collections/$collectionId/items/$itemId"
      params={{ collectionId: item.collectionId, itemId: item.id }}
      className="block rounded-lg border border-primary-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <h3 className="font-semibold text-primary-900">{item.title}</h3>
      {item.description && (
        <p className="mt-1 line-clamp-2 text-sm text-primary-600">
          {item.description}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-primary-500">
        {item.dateCreated && <span>{formatDate(item.dateCreated)}</span>}
        {item.languages.length > 0 && <span>{item.languages.join(', ')}</span>}
        <span>{item.files.length} files</span>
      </div>
    </Link>
  );
}
