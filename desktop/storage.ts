import { ipcMain, app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Keys the renderer may read and write through IPC. Anything else in the
// store (or outside it, like the auth secret) is off limits to the page.
const RENDERER_KEYS = new Set([
  'erp-roadmap-progress-v2',
  'erp-roadmap-progress', // legacy progress, read once for migration
  'roadmap-language',
]);

export const getStore = () => {
  const storeFilePath = path.join(app.getPath('userData'), 'preferences.json');
  try {
    if (fs.existsSync(storeFilePath)) {
      return JSON.parse(fs.readFileSync(storeFilePath, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to read store', e);
  }
  return {};
};

export const saveStore = (data: Record<string, unknown>) => {
  const storeFilePath = path.join(app.getPath('userData'), 'preferences.json');
  try {
    const tempFile = `${storeFilePath}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, storeFilePath);
  } catch (e) {
    console.error('Failed to save store', e);
  }
};

function getAuthSecretPath() {
  return path.join(app.getPath('userData'), 'auth-secret.enc');
}

function writeAuthSecret(secret: string) {
  // Encrypted with the OS keychain when available; otherwise kept as a
  // user-only file, which is no worse than the previous preferences.json.
  const contents = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(secret)
    : Buffer.from(`plain:${secret}`, 'utf-8');
  fs.writeFileSync(getAuthSecretPath(), contents, { mode: 0o600 });
}

function readAuthSecret(): string | null {
  const secretPath = getAuthSecretPath();
  if (!fs.existsSync(secretPath)) return null;
  try {
    const contents = fs.readFileSync(secretPath);
    if (contents.subarray(0, 6).toString('utf-8') === 'plain:') {
      return contents.subarray(6).toString('utf-8');
    }
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(contents);
    }
  } catch (e) {
    console.error('Failed to read auth secret', e);
  }
  return null;
}

// Returns the Auth.js signing secret for the local server, creating it on
// first run and moving it out of preferences.json for older installs.
export function getAuthSecret(): string {
  const store = getStore();
  if (store.authSecret) {
    const legacySecret: string = store.authSecret;
    writeAuthSecret(legacySecret);
    delete store.authSecret;
    saveStore(store);
    return legacySecret;
  }

  const existing = readAuthSecret();
  if (existing) return existing;

  // A new secret only signs the user out; it never loses data
  const secret = crypto.randomBytes(32).toString('hex');
  writeAuthSecret(secret);
  return secret;
}

export function setupStorageHandlers() {
  ipcMain.handle('store-get', (event, key: string) => {
    if (!RENDERER_KEYS.has(key)) return undefined;
    const store = getStore();
    return store[key];
  });

  ipcMain.handle('store-set', (event, key: string, value: unknown) => {
    if (!RENDERER_KEYS.has(key) || typeof value !== 'string') return false;
    const store = getStore();
    store[key] = value;
    saveStore(store);
    return true;
  });

  ipcMain.handle('store-delete', (event, key: string) => {
    if (!RENDERER_KEYS.has(key)) return false;
    const store = getStore();
    delete store[key];
    saveStore(store);
    return true;
  });
}
