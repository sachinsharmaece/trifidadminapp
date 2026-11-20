import { useEffect } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button, buttonStyles } from '@/components/atoms/Button';
import { ErrorState } from '@/components/molecules/ErrorState';

/** The router's errorElement: shown when a route throws while rendering or loading. */
export function RouteErrorPage() {
  const error = useRouteError();

  useEffect(() => {
    console.error('Route error', error);
  }, [error]);

  let title = 'Something went wrong';
  let message =
    'An unexpected error happened on this page. You can try again or go back to the dashboard.';

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? "We can't find that page" : `Error ${error.status}`;
  } else if (import.meta.env.DEV && error instanceof Error) {
    message = error.message; // helpful while developing; hidden from real users
  }

  return (
    <div className="py-16">
      <ErrorState title={title} message={message}>
        <Button onClick={() => window.location.reload()}>Reload page</Button>
        <Link to="/" className={buttonStyles({ variant: 'secondary' })}>
          Back to dashboard
        </Link>
      </ErrorState>
    </div>
  );
}
