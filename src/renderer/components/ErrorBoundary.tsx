import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { reportError, sendUserFeedback } from '@/telemetry';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  /** Sentry event id for the caught error, used to associate user feedback. */
  eventId: string | null;
  /** True once we've confirmed the user hasn't opted out of error reporting. */
  canSendFeedback: boolean;
  feedbackMessage: string;
  hasSentFeedback: boolean;
};

/**
 * Catches render-time errors anywhere below it, reports them to Sentry, and shows
 * a themed fallback instead of a blank white screen. When error reporting is
 * enabled, it also offers a small feedback form linked to the captured event.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    eventId: null,
    canSendFeedback: false,
    feedbackMessage: '',
    hasSentFeedback: false,
  };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const eventId = reportError(error, { extra: { componentStack: info.componentStack } });
    this.setState({ eventId });
    // The boundary sits above the React Query provider, so read the opt-out via
    // IPC directly. Only offer feedback when the user hasn't opted out — the
    // feedback envelope bypasses the main-process `beforeSend` gate.
    void window.findias
      .getSetupState()
      .then((state) => this.setState({ canSendFeedback: state.isErrorReportingEnabled }))
      .catch(() => this.setState({ canSendFeedback: false }));
  }

  private handleSendFeedback = (): void => {
    const message = this.state.feedbackMessage.trim();
    if (!message) return;
    sendUserFeedback(message, this.state.eventId ?? undefined);
    this.setState({ hasSentFeedback: true });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    const { canSendFeedback, feedbackMessage, hasSentFeedback } = this.state;

    return (
      <div className="flex h-full items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col gap-3">
              <p>
                Findias hit an unexpected error and couldn&apos;t continue. The problem has been
                reported. Reloading usually fixes it.
              </p>
              {canSendFeedback &&
                (hasSentFeedback ? (
                  <p>Thanks — your feedback was sent.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      value={feedbackMessage}
                      onChange={(event) => this.setState({ feedbackMessage: event.target.value })}
                      placeholder="What were you doing when this happened? (optional)"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="self-start"
                      disabled={!feedbackMessage.trim()}
                      onClick={this.handleSendFeedback}
                    >
                      Send feedback
                    </Button>
                  </div>
                ))}
              <div>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  Reload
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
}

export default ErrorBoundary;
