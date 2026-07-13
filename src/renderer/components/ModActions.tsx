import type { FC } from 'react';
import { Trash2 } from 'lucide-react';
import type { ModAction, ModVariantRow } from '@shared/modList';
import { Button } from '@/components/ui/button';
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

type ModActionsProps = {
  variant: ModVariantRow;
  /** When true, all actions on this row are disabled (busy or bulk update in flight). */
  isDisabled: boolean;
  onAction: (action: ModAction, modId: string) => void;
};

const ACTION_LABEL: Record<ModAction, string> = {
  install: 'Install',
  update: 'Update Available',
  enable: 'Enable',
  disable: 'Disable',
  delete: 'Delete',
};

type ButtonVariant = 'default' | 'outline' | 'destructive';

/** Map a mod action to the shadcn button variant that conveys its intent. */
const actionVariant = (action: ModAction): ButtonVariant => {
  if (action === 'delete') return 'destructive';
  if (action === 'install' || action === 'update' || action === 'enable') return 'default';
  return 'outline';
};

/**
 * The action buttons for a mod/variant: Delete sits behind an {@link AlertDialog}
 * confirm as a circular destructive icon button; the rest are text buttons whose
 * variant conveys intent. Each button stops click propagation so it never also
 * toggles/selects the clickable row or header it renders inside — letting the
 * fragment drop straight into an `ItemActions` flex container without a wrapper.
 */
const ModActions: FC<ModActionsProps> = ({ variant, isDisabled, onAction }) => {
  return (
    <>
      {variant.actions.map((action) =>
        action === 'delete' ? (
          <AlertDialog key={action}>
            <AlertDialogTrigger asChild>
              <Button
                size="icon-sm"
                variant="destructive"
                disabled={isDisabled}
                aria-label={ACTION_LABEL[action]}
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {variant.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the mod file from your package folder. You can reinstall it later.
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
            disabled={isDisabled}
            onClick={(e) => {
              e.stopPropagation();
              onAction(action, variant.modId);
            }}
          >
            {ACTION_LABEL[action]}
          </Button>
        ),
      )}
    </>
  );
};

export default ModActions;
