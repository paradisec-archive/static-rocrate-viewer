import {
  createRootRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { SearchBar } from "../components/SearchBar";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const { location } = useRouterState();
  const searchParams = new URLSearchParams(
    location.search as unknown as string,
  );
  const currentQuery =
    location.pathname === "/search" ? (searchParams.get("q") ?? "") : "";

  return (
    <div className="min-h-screen bg-primary-50">
      <header className="border-b border-primary-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link
            to="/"
            className="text-lg font-bold text-primary-900 whitespace-nowrap"
          >
            RO-Crate Viewer
          </Link>
          <SearchBar initialQuery={currentQuery} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
