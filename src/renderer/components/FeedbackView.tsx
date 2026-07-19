import { useMemo, useState, type FC, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ModListState } from '@shared/modList';
import {
  buildIssueUrl,
  formatDiagnostics,
  getIssuesPageUrl,
  getRepoName,
  type DiagnosticsMod,
  type FeedbackType,
} from '@/lib/issueUrl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Per-type copy for the dropdown, the body field, and the title placeholder. */
const TYPE_CONFIG: Record<
  FeedbackType,
  {
    label: string;
    description: string;
    bodyLabel: string;
    bodyPlaceholder: string;
    titlePlaceholder: string;
  }
> = {
  'app-feedback': {
    label: 'App feedback',
    description: 'Share ideas or suggestions about Findias.',
    bodyLabel: 'Your feedback',
    bodyPlaceholder: "I'd love it if Findias could...",
    titlePlaceholder: 'A short summary of your feedback',
  },
  'bug-report': {
    label: 'Bug report',
    description: 'Report a problem in Findias. Diagnostic details are attached automatically.',
    bodyLabel: 'What happened?',
    bodyPlaceholder: 'When I clicked..., Findias...',
    titlePlaceholder: 'A short summary of the bug',
  },
  'feature-request': {
    label: 'Feature request',
    description: 'Suggest a new feature or enhancement for Findias.',
    bodyLabel: 'What would you like?',
    bodyPlaceholder: "I'd like Findias to...",
    titlePlaceholder: 'A short summary of the feature',
  },
  'mod-request': {
    label: 'Mod request',
    description: 'Request a new mod, or an addition to an existing one.',
    bodyLabel: 'What mod would you like?',
    bodyPlaceholder: 'A mod that...',
    titlePlaceholder: 'A short summary of the mod',
  },
};

const TYPE_ORDER: FeedbackType[] = ['app-feedback', 'bug-report', 'feature-request', 'mod-request'];

/**
 * An inline link that opens in the user's browser. Renderer anchors can't
 * navigate the app shell, so the click is routed through `openExternal`.
 */
const ExternalLink: FC<{ href: string; children: ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    onClick={(event) => {
      event.preventDefault();
      window.findias.openExternal(href);
    }}
    className="font-medium underline underline-offset-4 hover:text-primary"
  >
    {children}
  </a>
);

/** Flatten a resolved mod list into the installed mods shown in diagnostics. */
const collectInstalledMods = (modList: ModListState | undefined): DiagnosticsMod[] => {
  if (!modList) return [];
  return modList.groups.flatMap((group) =>
    group.variants
      .filter((variant) => variant.state.presence !== 'absent')
      .map((variant) => ({ name: variant.name, version: variant.installedVersion })),
  );
};

/**
 * Lightweight feedback form. It collects a type, a title, and a short body,
 * then hands off to the matching repo's prefilled GitHub issue form via
 * {@link buildIssueUrl} + `openExternal`. Bug reports attach an auto-generated
 * diagnostics block, previewed here exactly as it will be submitted. No files
 * are uploaded from the app — users attach those on GitHub.
 */
const FeedbackView: FC = () => {
  const queryClient = useQueryClient();
  const [type, setType] = useState<FeedbackType>('app-feedback');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const { data: appInfo } = useQuery({
    queryKey: ['appInfo'],
    queryFn: () => window.findias.getAppInfo(),
  });

  const config = TYPE_CONFIG[type];
  const isBugReport = type === 'bug-report';

  // Diagnostics read the last resolved mod list from the cache (seeded by the
  // main view) rather than triggering a fetch of their own.
  const diagnostics = useMemo(() => {
    if (!appInfo) return '';
    const modList = queryClient.getQueryData<ModListState>(['modList']);
    return formatDiagnostics({
      appVersion: appInfo.appVersion,
      platform: appInfo.platform,
      osVersion: appInfo.osVersion,
      gameVersion: modList?.metadata?.currentGameVersion ?? null,
      installedMods: collectInstalledMods(modList),
    });
  }, [appInfo, queryClient]);

  const isSubmittable = title.trim().length > 0 && body.trim().length > 0;

  const handleSubmit = (): void => {
    const url = buildIssueUrl(type, {
      title,
      body,
      diagnostics: isBugReport ? diagnostics : undefined,
    });
    window.findias.openExternal(url);
    toast.success('Opened GitHub in your browser to finish submitting.');
  };

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[46rem] flex-col p-6">
      <h1 className="shrink-0 pb-2 font-heading text-3xl font-semibold">Feedback</h1>
      <p className="shrink-0 pb-6 text-sm text-muted-foreground">
        Fill this out and we'll open a prefilled GitHub issue in your browser, where you can review,
        attach files, and submit.
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex w-full flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="feedback-type">Type</Label>
            <Select value={type} onValueChange={(next) => setType(next as FeedbackType)}>
              <SelectTrigger id="feedback-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_ORDER.map((value) => (
                  <SelectItem key={value} value={value}>
                    {TYPE_CONFIG[value].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {config.description} Sent to the{' '}
              <ExternalLink href={getIssuesPageUrl(type)}>
                {getRepoName(type)} GitHub Issues
              </ExternalLink>{' '}
              page.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="feedback-title">Title</Label>
            <Input
              id="feedback-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={config.titlePlaceholder}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="feedback-body">{config.bodyLabel}</Label>
            <Textarea
              id="feedback-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={config.bodyPlaceholder}
              className="min-h-32"
            />
          </div>

          {isBugReport && (
            <div className="flex flex-col gap-2">
              <Label>Diagnostics included</Label>
              <p className="text-sm text-muted-foreground">
                Attached automatically to help us debug. No personal data is included.
              </p>
              <pre className="overflow-x-auto rounded-2xl bg-muted p-3 text-xs whitespace-pre-wrap text-muted-foreground">
                {diagnostics || 'Gathering diagnostics...'}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 justify-end pt-6">
        <Button onClick={handleSubmit} disabled={!isSubmittable}>
          Continue on GitHub
        </Button>
      </div>
    </div>
  );
};

export default FeedbackView;
