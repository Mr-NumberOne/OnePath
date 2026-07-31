import { contextBridge, ipcRenderer } from 'electron';

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('desktopAPI', {
  // Store methods
  getStoreValue: (key: string) => ipcRenderer.invoke('store-get', key),
  setStoreValue: (key: string, value: any) => ipcRenderer.invoke('store-set', key, value),
  deleteStoreValue: (key: string) => ipcRenderer.invoke('store-delete', key),
  startGoogleAuth: () => ipcRenderer.invoke('auth-start-google'),
  logout: () => ipcRenderer.invoke('auth-logout'),
});
