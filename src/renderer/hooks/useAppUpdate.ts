import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Subscribe to app self-update events and surface a persistent "restart to
 * install" toast once an update has downloaded. The action calls
 * `installUpdate()` (quit + install); dismissing keeps the current version, and
 * because the main process leaves `autoInstallOnAppQuit` on, the update still
 * applies on the next normal close.
 *
 * The updater only runs in packaged builds, so in dev these events never fire.
 */
export const useAppUpdate = (): void => {
  useEffect(() => {
    const TOAST_ID = 'app-update-downloaded';

    return window.findias.onUpdateStatus((status) => {
      if (status.state === 'downloaded') {
        toast.success('Update ready to install', {
          id: TOAST_ID,
          description: status.version
            ? `Findias ${status.version} has been downloaded.`
            : 'A new version of Findias has been downloaded.',
          duration: Infinity,
          closeButton: true,
          action: {
            label: 'Restart & install',
            onClick: () => window.findias.installUpdate(),
          },
        });
      } else if (status.state === 'error') {
        // Keep this quiet and non-blocking: a failed background update check
        // should never interrupt normal use.
        console.warn('App update error:', status.message);
      }
    });
  }, []);
};
