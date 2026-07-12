import { useEffect } from 'react';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { showAppUpdateReadyToast } from '../showAppUpdateReadyToast';

/**
 * Subscribe to app self-update events and surface a persistent "restart to
 * install" toast once an update has downloaded. The action calls
 * `installUpdate()` (quit + install); dismissing keeps the current version, and
 * because the main process leaves `autoInstallOnAppQuit` on, the update still
 * applies on the next normal close.
 *
 * The updater only runs in packaged builds, so in dev these events never fire.
 * Run `__previewAppUpdateToast()` from devtools to preview the toast.
 */
export const useAppUpdate = (): void => {
  const isPreviewAppUpdateToastEnabled = useFeatureFlag('previewAppUpdateToast');

  useEffect(() => {
    if (isPreviewAppUpdateToastEnabled) {
      window.__previewAppUpdateToast = (version?: string) => {
        showAppUpdateReadyToast({ version: version || '9.9.9-preview' });
      };
    }

    return window.findias.onUpdateStatus((status) => {
      if (status.state === 'downloaded') {
        showAppUpdateReadyToast({ version: status.version });
      } else if (status.state === 'error') {
        // Keep this quiet and non-blocking: a failed background update check
        // should never interrupt normal use.
        console.warn('App update error:', status.message);
      }
    });
  }, [isPreviewAppUpdateToastEnabled]);
};
