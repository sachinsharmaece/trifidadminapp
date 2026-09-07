import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface RequireAuthProps {
  children: ReactNode;
  // TD-007 — checked as a permission string, never a role name.
  permission?: string;
}

/**
 * Checks the session and the required permission before rendering a route
 * (ARCHITECTURE.md §M2 frontend scope). A user without the permission sees a
 * plain "not permitted" message rather than a broken screen — the server
 * would refuse the underlying API call anyway (TD-007), so this is a
 * courtesy, not the enforcement boundary.
 */
export function RequireAuth({ children, permission }: RequireAuthProps) {
  const { status, hasPermission } = useAuth();

  if (status === 'loading') {
    return (
      <main className="page-state">
        <p>Loading…</p>
      </main>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <main className="page-state">
        <h1>Not permitted</h1>
        <p>Your account does not have access to this screen.</p>
      </main>
    );
  }

  return <>{children}</>;
}
