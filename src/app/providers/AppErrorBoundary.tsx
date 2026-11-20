import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/atoms/Button';
import { ErrorState } from '@/components/molecules/ErrorState';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

/**
 * Last line of defence: if rendering crashes anywhere outside a route (providers, router setup...),
 * show a message instead of a blank white page. Route-level crashes are handled by RouteErrorPage.
 * React only supports error boundaries as classes, which is why this is not a function component.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <ErrorState
            title="Something went wrong"
            message="The app hit an unexpected problem. Reloading usually fixes it."
          >
            <Button onClick={() => window.location.reload()}>Reload page</Button>
          </ErrorState>
        </div>
      );
    }

    return this.props.children;
  }
}
