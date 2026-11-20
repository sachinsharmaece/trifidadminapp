import { Navigate, Outlet, useLocation } from 'react-router';
import { Button } from '@/components/atoms/Button';
import { ErrorState } from '@/components/molecules/ErrorState';
import { PageSpinner } from '@/components/molecules/PageSpinner';
import { useCurrentUser } from './hooks';

/** Wraps every page that needs a signed-in user. Anyone else is sent to the login page. */
export function RequireAuth() {
  const { data: user, isPending, isError, error, refetch } = useCurrentUser();
  const location = useLocation();

  if (isPending) {
    return <PageSpinner label="Checking your session" />;
  }
  if (isError) {
    // Not "signed out": we simply could not ask (server down, no network).
    return (
      <ErrorState title="Cannot reach the server" message={error.message}>
        <Button onClick={() => void refetch()}>Try again</Button>
      </ErrorState>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  // Still on a temporary password: the only page allowed is the one where they choose their own.
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return <Outlet />;
}
