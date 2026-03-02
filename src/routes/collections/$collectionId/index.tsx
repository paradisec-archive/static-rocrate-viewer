import { createFileRoute } from '@tanstack/react-router';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { ItemCard } from '../../../components/ItemCard';
import { MetadataPanel } from '../../../components/MetadataPanel';
import { useCatalog } from '../../../hooks/useCatalog';
import { useRoCrate } from '../../../hooks/useRoCrate';

export const Route = createFileRoute('/collections/$collectionId/')({
  component: CollectionPage,
});

function CollectionPage() {
  const { collectionId } = Route.useParams();
  const { data: catalog, isLoading, error } = useCatalog();
  const { data: crate } = useRoCrate(collectionId);

  if (isLoading) return <p className="text-primary-500">Loading...</p>;
  if (error) return <p className="text-red-600">Error: {error.message}</p>;

  const collection = catalog?.collections.find((c) => c.id === collectionId);
  if (!collection)
    return <p className="text-red-600">Collection not found: {collectionId}</p>;

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: collection.id }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary-900">{collection.id}</h1>
        <p className="mt-1 text-lg text-primary-600">{collection.name}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-primary-500">
          <span>{collection.items.length} items</span>
          {collection.languages.length > 0 && (
            <span>{collection.languages.join(', ')}</span>
          )}
          {collection.countries.length > 0 && (
            <span>{collection.countries.join(', ')}</span>
          )}
        </div>
      </div>

      {crate && (
        <div className="mb-8">
          <MetadataPanel rootDataset={crate.rootDataset} />
        </div>
      )}

      <h2 className="mb-4 text-lg font-semibold text-primary-800">Items</h2>
      <div className="space-y-3">
        {collection.items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
