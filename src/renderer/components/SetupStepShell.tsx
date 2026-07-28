import type { FC, ReactNode } from 'react';

type SetupStepShellProps = {
  icon?: ReactNode;
  title?: string;
  description?: ReactNode;
  children: ReactNode;
};

/** Centered max-width column shared by first-run setup steps. */
const SetupStepShell: FC<SetupStepShellProps> = ({ icon, title, description, children }) => (
  <div className="flex h-full items-center justify-center px-4 py-8">
    <div className="flex w-full max-w-lg flex-col gap-6 text-center">
      {icon ? <div className="flex justify-center">{icon}</div> : null}
      {title ? <h1 className="font-heading text-3xl font-semibold">{title}</h1> : null}
      {description ? (
        <div className="flex flex-col gap-3 text-sm text-muted-foreground">{description}</div>
      ) : null}
      {children}
    </div>
  </div>
);

export default SetupStepShell;
