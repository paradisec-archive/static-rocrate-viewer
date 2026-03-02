import { createFileRoute } from "@tanstack/react-router";
import { ItemCard } from "../components/ItemCard";
import { useSearch } from "../hooks/useSearch";

interface SearchParams {
  q?: string;
}

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: (search.q as string) ?? "",
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { results, isReady } = useSearch(q ?? "");

  if (!isReady) return <p className="text-primary-500">Loading...</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-primary-900">
        {q ? `Search results for "${q}"` : "All items"}
      </h1>
      {results.length === 0 ? (
        <p className="text-primary-500">No results found.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-primary-500">{results.length} results</p>
          {results.map((item) => (
            <ItemCard key={`${item.collectionId}/${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
