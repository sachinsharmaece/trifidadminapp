import { RouterProvider } from 'react-router/dom';
import { AppErrorBoundary } from './providers/AppErrorBoundary';
import { AppProviders } from './providers/AppProviders';
import { router } from './router/router';

export function App() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </AppErrorBoundary>
  );
}
