import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { reportError } from '@/telemetry';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

/**
 * Catches render-time errors anywhere below it, reports them to Sentry, and shows
 * a themed fallback instead of a blank white screen. React error boundaries must
 * be class components, so this is the one deliberate exception to the
 * arrow-function/`FC` conventions.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, { extra: { componentStack: info.componentStack } });
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex h-full items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            Findias hit an unexpected error and couldn&apos;t continue. The problem has been
            reported. Reloading usually fixes it.
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Reload
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
}

export default ErrorBoundary;
