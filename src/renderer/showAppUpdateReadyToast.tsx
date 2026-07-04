import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export const APP_UPDATE_TOAST_ID = 'app-update-downloaded';

export type AppUpdateToastOptions = {
  /** Shown in the description line; omit for the generic copy. */
  version?: string;
  /** Defaults to persistent (`Infinity`) for real downloaded updates. */
  duration?: number;
};

/** Surface the "restart to install" toast for a downloaded app update. */
export const showAppUpdateReadyToast = ({
  version,
  duration = Infinity,
}: AppUpdateToastOptions = {}): void => {
  toast('Update ready to install', {
    id: APP_UPDATE_TOAST_ID,
    description: version
      ? `Findias ${version} has been downloaded.`
      : 'A new version of Findias has been downloaded.',
    duration,
    closeButton: false,
    dismissible: false,
    icon: null,
    action: (
      <Button size="sm" onClick={() => window.findias.installUpdate()}>
        Restart & Install
      </Button>
    ),
    cancel: (
      <Button variant="outline" size="sm" onClick={() => toast.dismiss(APP_UPDATE_TOAST_ID)}>
        Skip
      </Button>
    ),
  });
};
