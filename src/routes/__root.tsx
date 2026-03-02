import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { SearchBar } from '../components/SearchBar';

const RootLayout = () => (
  <div className="min-h-screen bg-primary-50">
    <header className="border-b border-primary-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link
          to="/"
          className="text-lg font-bold text-primary-900 whitespace-nowrap"
        >
          RO-Crate Viewer
        </Link>

        <SearchBar />
      </div>
    </header>

    <main className="mx-auto max-w-6xl px-4 py-6">
      <Outlet />
    </main>
  </div>
);

export const Route = createRootRoute({
  component: RootLayout,
});
