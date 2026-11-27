import { Outlet } from 'react-router';
import { RoleNav } from '@/components/organisms/RoleNav';
import { useCurrentUser, useLogout } from '@/features/auth/hooks';

/** The frame around every in-app page, as the reference (components/layout/AuthenticatedShell.tsx). */
export function AppShell() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  if (!user) return null;

  return (
    <div className="flex h-screen flex-1">
      <RoleNav
        role={user.role}
        name={user.name}
        position={user.position ?? null}
        onSignOut={() => logout.mutate()}
      />
      <main className="min-w-0 flex-1 overflow-y-auto bg-zinc-50 pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
