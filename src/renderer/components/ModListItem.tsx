import type { FC } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { DownloadProgress } from '@shared/api';
import type { ModAction, ModVariantRow } from '@shared/modList';
import { formatBytes } from '../format';
import StatusChip from './StatusChip';

type ModListItemProps = {
  variant: ModVariantRow;
  /** Group tags to display above the row (omitted for variant sub-rows). */
  tags?: string[];
  busy: boolean;
  progress?: DownloadProgress;
  /** When true, the catalog banner is active, so the updateType chip is shown. */
  outdated: boolean;
  onAction: (action: ModAction, modId: string) => void;
};

const ACTION_LABEL: Record<ModAction, string> = {
  install: 'Install',
  update: 'Update',
  enable: 'Enable',
  disable: 'Disable',
  delete: 'Delete',
};

/** Extra button classes for actions that need distinct styling (e.g. delete). */
const actionClassName = (action: ModAction): string => {
  if (action === 'delete') return 'border-destructive/40 text-destructive hover:bg-destructive/10';
  return '';
};

/** Map a mod action to the shadcn Button variant. */
const actionVariant = (action: ModAction): 'default' | 'outline' => {
  if (action === 'install' || action === 'update' || action === 'enable') return 'default';
  return 'outline';
};

/** One-line release, installed, and size summary for a mod variant. */
const versionSummary = (variant: ModVariantRow): string => {
  const release =
    variant.releaseVersion === null ? 'not in release' : `release v${variant.releaseVersion}`;
  const installed =
    variant.installedVersion === null ? 'not installed' : `installed v${variant.installedVersion}`;
  const size = variant.size === null ? '' : ` • ${formatBytes(variant.size)}`;
  return `${release} • ${installed}${size}`;
};

/** Single mod row: metadata, action buttons, and optional download progress. */
const ModListItem: FC<ModListItemProps> = ({
  variant,
  tags,
  busy,
  progress,
  outdated,
  onAction,
}) => {
  const percent =
    progress && progress.totalBytes
      ? Math.min(100, Math.round((progress.receivedBytes / progress.totalBytes) * 100))
      : null;

  const showUpdateType = outdated && variant.updateType !== null;

  return (
    <div className="flex flex-wrap items-start gap-2 border-b py-3 last:border-b-0">
      <div className="flex min-w-0 flex-grow flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium break-words">{variant.name}</span>
          <StatusChip status={variant.status} />
        </div>

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-muted-foreground">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <p className="text-sm text-muted-foreground">{versionSummary(variant)}</p>

        {showUpdateType && variant.updateType && (
          <div>
            <Badge
              className={cn(
                variant.updateType === 'volatile'
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-emerald-500/15 text-emerald-400',
              )}
            >
              {variant.updateType === 'volatile'
                ? 'Volatile — likely affected by patches'
                : 'Stable — usually survives patches'}
            </Badge>
          </div>
        )}

        {variant.conflicts.length > 0 && (
          <p className="text-sm text-amber-400">
            Conflicts with {variant.conflicts.map((c) => c.modName).join(', ')}. Disable or delete
            it to enable this mod.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        {variant.actions.map((action) =>
          action === 'delete' ? (
            <AlertDialog key={action}>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  className={actionClassName(action)}
                >
                  {ACTION_LABEL[action]}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {variant.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the mod files from your game folder. You can reinstall it later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => onAction('delete', variant.modId)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              key={action}
              size="sm"
              variant={actionVariant(action)}
              disabled={busy}
              onClick={() => onAction(action, variant.modId)}
            >
              {ACTION_LABEL[action]}
            </Button>
          ),
        )}
      </div>

      {busy && (
        <div className="w-full">
          {percent === null ? (
            <div className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
            </div>
          ) : (
            <Progress value={percent} />
          )}
        </div>
      )}
    </div>
  );
};

export default ModListItem;
