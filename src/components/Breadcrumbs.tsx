import { Link } from '@tanstack/react-router';

interface Crumb {
  label: string;
  to?: string;
  params?: Record<string, string>;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-primary-500">
      <ol className="flex items-center gap-1">
        <li>
          <Link to="/" className="hover:text-primary-700">
            Home
          </Link>
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.label} className="flex items-center gap-1">
            <span aria-hidden="true">/</span>
            {crumb.to ? (
              <Link
                to={crumb.to}
                params={crumb.params}
                className="hover:text-primary-700"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-primary-800">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
