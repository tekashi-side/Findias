import { useState, type FC } from 'react';
import type { SetupState } from '@shared/api';
import { Button } from '@/components/ui/button';
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item';
import { reportError } from '@/telemetry';

/** Throws during render so the app-level ErrorBoundary catches it. */
const Bomb = (): never => {
  throw new Error('TEST render crash (ErrorBoundary)');
};

type SentryTestPanelProps = {
  setup: SetupState;
};

/**
 * Dev-only Sentry self-test panel. Rendered in Settings only during an
 * `npm run dev:log` session (gated by the caller), it exposes one button per
 * capture path so the whole telemetry pipeline can be verified by hand. The
 * three main-process paths route through the dev-only `debugTelemetry` IPC
 * channel; the rest are triggered directly in the renderer.
 */
const SentryTestPanel: FC<SentryTestPanelProps> = ({ setup }) => {
  const [shouldCrash, setShouldCrash] = useState(false);

  return (
    <ItemGroup className="max-w-2xl">
      {shouldCrash && <Bomb />}
      <Item variant="outline" className="items-start">
        <ItemContent>
          <ItemTitle>Sentry self-test (dev only)</ItemTitle>
          <ItemDescription>
            Reporting is currently {setup.isErrorReportingEnabled ? 'ON' : 'OFF (events dropped)'}.
          </ItemDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => reportError(new Error('TEST renderer manual report'))}
            >
              Manual (renderer)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setTimeout(() => {
                  throw new Error('TEST renderer uncaught');
                })
              }
            >
              Uncaught (renderer)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void Promise.reject(new Error('TEST unhandled rejection'));
              }}
            >
              Unhandled rejection
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShouldCrash(true)}>
              Render crash
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void window.findias.debugTelemetry('report')}
            >
              Manual (main)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void window.findias.debugTelemetry('throw')}
            >
              Uncaught (main) - closes app
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void window.findias.debugTelemetry('nativeCrash')}
            >
              Native crash - closes app
            </Button>
          </div>
        </ItemContent>
      </Item>
    </ItemGroup>
  );
};

export default SentryTestPanel;
