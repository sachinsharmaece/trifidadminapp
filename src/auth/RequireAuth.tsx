import type { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { homePathFor } from './homePath';
import { Loader } from '../components/ui/Loader';
import { ErrorState } from '../components/ui/ErrorState';
import { Button } from '../components/ui/Button';

interface RequireAuthProps {
  children: ReactNode;
  // TD-007 — checked as a permission string, never a role name.
  // Several strings means "any one of them" (e.g. the Registers screen, one register per desk).
  permission?: string | string[];
  /** 30 Oct — `/` (Team): someone who cannot open it is sent to his own desk instead. */
  redirectHomeIfDenied?: boolean;
}

/**
 * Checks the session and the required permission before rendering a route
 * (ARCHITECTURE.md §M2 frontend scope). A user without the permission sees a
 * plain "not permitted" message rather than a broken screen — the server
 * would refuse the underlying API call anyway (TD-007), so this is a
 * courtesy, not the enforcement boundary.
 */
export function RequireAuth({ children, permission, redirectHomeIfDenied }: RequireAuthProps) {
  const { status, hasPermission, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader />
      </main>
    );
  }

  if (status === 'anonymous') {
    // 30 Oct — remember where he was, so signing in brings him back there.
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    );
  }

  const required = permission === undefined ? [] : [permission].flat();
  if (required.length > 0 && !required.some((p) => hasPermission(p))) {
    const home = homePathFor(hasPermission);
    if (redirectHomeIfDenied && home && home !== location.pathname) {
      return <Navigate to={home} replace />;
    }
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h1 className="mb-3 text-lg font-semibold text-slate-900">Not permitted</h1>
          <ErrorState
            message={
              home
                ? 'Your account does not have access to this screen.'
                : 'Your account has no desk yet. Ask an Admin to give you a role.'
            }
          />
          <div className="mt-4 flex justify-center">
            {home ? (
              <Button onClick={() => navigate(home)}>Go to my desk</Button>
            ) : (
              <Button variant="secondary" onClick={() => void logout()}>
                Sign out
              </Button>
            )}
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
