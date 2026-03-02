import { createFileRoute } from "@tanstack/react-router";
import { CollectionCard } from "../components/CollectionCard";
import { useCatalog } from "../hooks/useCatalog";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: catalog, isLoading, error } = useCatalog();

  if (isLoading) return <p className="text-primary-500">Loading...</p>;
  if (error) return <p className="text-red-600">Error: {error.message}</p>;
  if (!catalog) return null;

  const totalItems = catalog.collections.reduce(
    (sum, c) => sum + c.items.length,
    0,
  );
  const totalFiles = catalog.collections.reduce(
    (sum, c) => sum + c.items.reduce((s, i) => s + i.files.length, 0),
    0,
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary-900">Collections</h1>
        <p className="mt-1 text-sm text-primary-500">
          {catalog.collections.length} collections, {totalItems} items,{" "}
          {totalFiles} files
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.collections.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </div>
    </div>
  );
}
