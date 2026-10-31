// Bridge exposed by desktop/preload.ts in the Electron app; undefined on the web.

interface DesktopAuthResult {
  access_token: string;
  user: { id: string; name?: string; email?: string; image?: string };
  // False when the sign-in could not be remembered for the next launch
  rememberedLogin: boolean;
}

interface DesktopAPI {
  getStoreValue: (key: string) => Promise<string | undefined>;
  setStoreValue: (key: string, value: string) => Promise<boolean>;
  deleteStoreValue: (key: string) => Promise<boolean>;
  startGoogleAuth: () => Promise<DesktopAuthResult>;
  logout: () => Promise<boolean>;
}

interface Window {
  desktopAPI?: DesktopAPI;
}
