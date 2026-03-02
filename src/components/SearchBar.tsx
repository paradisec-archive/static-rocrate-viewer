import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

export function SearchBar({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const navigate = useNavigate();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!query.trim()) {
      return;
    }
    const timeout = setTimeout(() => {
      navigate({ to: '/search', search: { q: query } });
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, navigate]);

  return (
    <input
      type="search"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search collections, items, languages..."
      className="w-full max-w-md rounded-lg border border-primary-300 bg-white px-4 py-2 text-sm shadow-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
      aria-label="Search"
    />
  );
}
