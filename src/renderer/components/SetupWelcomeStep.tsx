import type { FC } from 'react';
import SetupStepShell from './SetupStepShell';
import { Button } from '@/components/ui/button';

type SetupWelcomeStepProps = {
  onContinue: () => void;
};

/** First-run welcome screen before folder selection. */
const SetupWelcomeStep: FC<SetupWelcomeStepProps> = ({ onContinue }) => (
  <SetupStepShell
    title="Welcome to Findias"
    description={
      <p>
        Findias is a simple mod manager for Mabinogi. Browse, install, update, disable, and remove
        mods with one click.
      </p>
    }
  >
    <div className="flex justify-center">
      <Button size="lg" onClick={onContinue}>
        Get started
      </Button>
    </div>
  </SetupStepShell>
);

export default SetupWelcomeStep;
