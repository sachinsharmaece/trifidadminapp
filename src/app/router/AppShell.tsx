import { Outlet } from 'react-router';
import { DashboardLayout } from '@/components/templates/DashboardLayout';
import { useCurrentUser } from '@/features/auth/hooks';
import { UserMenu } from '@/features/auth/UserMenu';
import { NAV_ITEMS } from '../navigation';

/** The frame around every in-app page: sidebar + header (with the signed-in user and Sign out). */
export function AppShell() {
  const { data: user } = useCurrentUser();
  // Show only the menu entries this person's role may open.
  const menu = NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <DashboardLayout navItems={menu} headerEnd={<UserMenu />}>
      <Outlet />
    </DashboardLayout>
  );
}
