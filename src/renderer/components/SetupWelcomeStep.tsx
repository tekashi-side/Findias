import type { FC } from 'react';
import { Button } from '@/components/ui/button';

type SetupWelcomeStepProps = {
  onContinue: () => void;
};

/** First-run welcome screen before folder selection. */
const SetupWelcomeStep: FC<SetupWelcomeStepProps> = ({ onContinue }) => (
  <div className="flex h-full items-center justify-center px-4 py-8">
    <div className="flex w-full max-w-lg flex-col gap-6 text-center">
      <h1 className="font-heading text-3xl font-semibold">Welcome to Findias</h1>
      <div className="flex flex-col gap-3 text-sm text-muted-foreground">
        <p>
          Findias is a simple mod manager for Mabinogi. Browse, install, update, disable, and remove
          mods with one click.
        </p>
      </div>
      <div className="flex justify-center">
        <Button size="lg" onClick={onContinue}>
          Get started
        </Button>
      </div>
    </div>
  </div>
);

export default SetupWelcomeStep;
