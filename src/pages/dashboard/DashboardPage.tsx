import { useCurrentUser } from '@/features/auth/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/** The reference's dashboard (app/dashboard/page.tsx): who is signed in, and a pointer to the menu. */
export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { data: user } = useCurrentUser();
  return (
    <div className="p-8">
      <h1 className="text-lg font-semibold text-zinc-900">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Signed in as <strong>{user?.role}</strong>. Use the links on the left for your area.
      </p>
    </div>
  );
}
