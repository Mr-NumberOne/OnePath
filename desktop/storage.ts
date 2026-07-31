import { ipcMain, app } from 'electron';
import fs from 'fs';
import path from 'path';

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

export const saveStore = (data: any) => {
  const storeFilePath = path.join(app.getPath('userData'), 'preferences.json');
  try {
    const tempFile = `${storeFilePath}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, storeFilePath);
  } catch (e) {
    console.error('Failed to save store', e);
  }
};

export function setupStorageHandlers() {
  const userDataPath = app.getPath('userData');
  const storeFilePath = path.join(userDataPath, 'preferences.json');



  ipcMain.handle('store-get', (event, key: string) => {
    const store = getStore();
    return store[key];
  });

  ipcMain.handle('store-set', (event, key: string, value: any) => {
    const store = getStore();
    store[key] = value;
    saveStore(store);
    return true;
  });

  ipcMain.handle('store-delete', (event, key: string) => {
    const store = getStore();
    delete store[key];
    saveStore(store);
    return true;
  });
}
