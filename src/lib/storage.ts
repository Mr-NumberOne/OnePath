export async function getStoredData(key: string): Promise<string | null> {
  if (typeof window !== 'undefined' && window.desktopAPI) {
    try {
      const val = await window.desktopAPI.getStoreValue(key);
      return val || null;
    } catch (e) {
      console.error('Failed to get from desktop storage', e);
      return null;
    }
  }
  
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key);
  }
  
  return null;
}

export async function setStoredData(key: string, value: string): Promise<void> {
  if (typeof window !== 'undefined' && window.desktopAPI) {
    try {
      await window.desktopAPI.setStoreValue(key, value);
      return;
    } catch (e) {
      console.error('Failed to save to desktop storage', e);
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

export async function removeStoredData(key: string): Promise<void> {
  if (typeof window !== 'undefined' && window.desktopAPI) {
    try {
      await window.desktopAPI.deleteStoreValue(key);
    } catch (e) {
      console.error('Failed to delete from desktop storage', e);
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem(key);
  }
}
