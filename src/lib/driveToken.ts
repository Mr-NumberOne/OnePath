import type { Session } from 'next-auth';
import { signIn } from 'next-auth/react';

// Returns a Google access token that is valid for Drive calls, or null when
// the user has to sign in again.
//
// The web build refreshes tokens on the server (see the jwt callback in
// src/auth.ts). The desktop app keeps the refresh token in Electron, so an
// expired desktop session is renewed through the desktop bridge instead.
export async function getDriveAccessToken(session: Session | null): Promise<string | null> {
  if (!session?.accessToken) return null;
  if (!session.error) return session.accessToken;

  if (typeof window !== 'undefined' && window.desktopAPI?.startGoogleAuth) {
    try {
      // Uses the stored refresh token; only opens the browser if that fails
      const result = await window.desktopAPI.startGoogleAuth();
      const res = await signIn('desktop', { redirect: false, accessToken: result.access_token });
      if (res?.ok && !res.error) return result.access_token;
    } catch (e) {
      console.error('Failed to renew desktop Google session', e);
    }
  }
  return null;
}
