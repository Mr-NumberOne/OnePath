import { app, BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';

// How often to look for a new release while the app stays open
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

// Checks GitHub Releases (see "publish" in electron-builder.yml) for a newer
// version, downloads it in the background and offers to restart once ready.
// Only runs in the installed app; failures (offline, no release yet) are logged.
export function setupAutoUpdates(getWindow: () => BrowserWindow | null) {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (error) => {
    console.error('Auto-update failed:', error);
  });

  let prompted = false;
  autoUpdater.on('update-downloaded', async (info) => {
    if (prompted) return;
    prompted = true;

    const window = getWindow();
    const options = {
      type: 'info' as const,
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update ready',
      message: `OnePath ${info.version} is ready to install.`,
      detail: 'Restart now to update, or it will be installed the next time you quit OnePath.',
    };
    const { response } = window
      ? await dialog.showMessageBox(window, options)
      : await dialog.showMessageBox(options);
    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  const check = () => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error('Update check failed:', error);
    });
  };
  check();
  setInterval(check, CHECK_INTERVAL_MS);
}
