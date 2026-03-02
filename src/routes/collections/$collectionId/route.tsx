import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/collections/$collectionId')({
  component: () => <Outlet />,
});
