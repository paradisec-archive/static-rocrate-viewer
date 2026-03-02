import { createFileRoute } from '@tanstack/react-router';
import { Breadcrumbs } from '../../../../components/Breadcrumbs';
import { FileTable } from '../../../../components/FileTable';
import { MetadataPanel } from '../../../../components/MetadataPanel';
import { useCatalog } from '../../../../hooks/useCatalog';
import { useRoCrate } from '../../../../hooks/useRoCrate';

export const Route = createFileRoute(
  '/collections/$collectionId/items/$itemId',
)({
  component: ItemPage,
});

function ItemPage() {
  const { collectionId, itemId } = Route.useParams();
  const { data: catalog } = useCatalog();
  const { data: crate, isLoading, error } = useRoCrate(collectionId, itemId);

  const collection = catalog?.collections.find((c) => c.id === collectionId);
  const item = collection?.items.find((i) => i.id === itemId);

  if (isLoading) {
    return <p className="text-primary-500">Loading...</p>;
  }
  if (error) {
    return <p className="text-red-600">Error: {error.message}</p>;
  }
  if (!item) {
    return (
      <p className="text-red-600">
        Item not found: {collectionId}/{itemId}
      </p>
    );
  }

  return (
    <div>
      <Breadcrumbs
        crumbs={[
          {
            label: collectionId,
            to: '/collections/$collectionId',
            params: { collectionId },
          },
          { label: itemId },
        ]}
      />
      <h1 className="mb-6 text-2xl font-bold text-primary-900">{item.title}</h1>

      <div className="space-y-8">
        {crate && <MetadataPanel rootDataset={crate.rootDataset} />}
        <FileTable files={item.files} />
      </div>
    </div>
  );
}
