import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Loader } from '../components/ui/Loader';
import { PERMISSIONS } from '../lib/permissions';

/**
 * 30 Oct — where each person lands: the first screen in this order they can open. Admin keeps
 * Team; Founder and Controller get their own desks; a Sales Leader who also holds the purchase
 * role lands on Sales. Was always `/` (Team, `employee:read`), so every other role saw
 * "Not permitted" straight after login.
 */
const HOME_ORDER: Array<{ path: string; permission: string }> = [
  // Admin holds every permission, so he is matched first by the one only he has.
  { path: '/', permission: PERMISSIONS.EMPLOYEE_WRITE },
  { path: '/founder', permission: PERMISSIONS.FOUNDER_OVERVIEW_READ },
  { path: '/controller', permission: PERMISSIONS.EXCEPTION_READ },
  { path: '/', permission: PERMISSIONS.EMPLOYEE_READ },
  { path: '/accounts', permission: PERMISSIONS.CHAIN_READ_FULL },
  { path: '/sales', permission: PERMISSIONS.SALES_WORKLIST_READ },
  { path: '/purchase', permission: PERMISSIONS.DEMAND_READ },
  { path: '/logistics', permission: PERMISSIONS.LOGISTICS_READ },
  { path: '/dock', permission: PERMISSIONS.DOCK_INSPECT },
  { path: '/marg', permission: PERMISSIONS.MARG_KEY },
  { path: '/registers', permission: PERMISSIONS.REGISTER_SALES_READ },
  { path: '/registers', permission: PERMISSIONS.REGISTER_PURCHASE_READ },
  { path: '/registrations', permission: PERMISSIONS.ONBOARDING_READ },
  { path: '/manage/products', permission: PERMISSIONS.CATALOG_WRITE },
  { path: '/manage/tehsils', permission: PERMISSIONS.TERRITORY_READ },
  { path: '/notifications', permission: PERMISSIONS.NOTIFICATION_LOG_READ },
];

/** His home screen, or null when he can open none of them. */
export function homePathFor(hasPermission: (permission: string) => boolean): string | null {
  return HOME_ORDER.find((h) => hasPermission(h.permission))?.path ?? null;
}

/** `/home` — waits for the session, then sends him to his own desk. */
export function HomeRedirect() {
  const { status, hasPermission } = useAuth();
  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader />
      </main>
    );
  }
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  // Nowhere to go: `/` shows the RequireAuth "no desk" message.
  return <Navigate to={homePathFor(hasPermission) ?? '/'} replace />;
}
