import { Outlet } from 'react-router';
import { UserMenu } from '@/features/auth/UserMenu';
import { DashboardLayout } from '@/components/templates/DashboardLayout';
import { NAV_ITEMS } from '../navigation';

/** The frame around every in-app page: sidebar + header (with the signed-in user and Sign out). */
export function AppShell() {
  return (
    <DashboardLayout navItems={NAV_ITEMS} headerEnd={<UserMenu />}>
      <Outlet />
    </DashboardLayout>
  );
}
