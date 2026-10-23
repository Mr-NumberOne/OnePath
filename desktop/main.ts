import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import { setupStorageHandlers, getAuthSecret } from './storage';
import { ServerManager } from './server-manager';
import { startGoogleAuthFlow, clearAuthTokens } from './auth';

const serverManager = new ServerManager();
let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  setupStorageHandlers();

  // Generate or load AUTH_SECRET for Next.js Desktop Mode
  process.env.AUTH_SECRET = getAuthSecret();
  process.env.DESKTOP_MODE = 'true';
  process.env.AUTH_TRUST_HOST = 'true';

  // Setup Auth IPC handlers
  ipcMain.handle('auth-start-google', async () => {
    try {
      const result = await startGoogleAuthFlow();
      return result;
    } catch (e: any) {
      console.error("Google auth failed:", e);
      throw new Error(e.message || "Auth failed");
    }
  });

  ipcMain.handle('auth-logout', async () => {
    await clearAuthTokens();
    return true;
  });

  let port = 3000;
  try {
    if (app.isPackaged) {
      port = await serverManager.startServer();
      console.log(`Next.js server started on port ${port}`);
    } else {
      console.log('Running in development mode, connecting to existing dev server on port 3000');
    }

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      title: 'OnePath',
      show: false, // Show gracefully when ready
    });

    // Remove the menu for a cleaner app feel
    mainWindow.setMenu(null);

    const loadURL = `http://127.0.0.1:${port}`;
    mainWindow.loadURL(loadURL);

    // Handle page load failures (e.g., server not ready yet)
    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      console.error(`Page failed to load: ${errorCode} ${errorDescription}`);
      // Retry after a short delay — the server may still be starting
      setTimeout(() => {
        mainWindow?.loadURL(loadURL);
      }, 2000);
    });

    mainWindow.once('ready-to-show', () => {
      mainWindow?.show();
    });

    // Secure external navigation
    mainWindow.webContents.setWindowOpenHandler((details) => {
      const url = details.url;
      // Only allow HTTP/HTTPS, and open in external browser
      if (url.startsWith('http:') || url.startsWith('https:')) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    // The window only ever shows the local app. Google sign-in runs in the
    // system browser (see auth.ts), so every other link opens externally.
    // Auth.js may build redirect URLs with "localhost" instead of 127.0.0.1
    const appOrigins = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
    mainWindow.webContents.on('will-navigate', (event, url) => {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        event.preventDefault();
        return;
      }
      if (appOrigins.has(parsedUrl.origin)) return;

      event.preventDefault();
      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        shell.openExternal(url);
      }
    });

  } catch (error) {
    console.error('Failed to start application:', error);
    // Could show a native error dialog here
    app.quit();
  }
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  serverManager.stopServer();
});
