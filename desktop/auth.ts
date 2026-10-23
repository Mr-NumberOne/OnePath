import { app, shell, safeStorage } from 'electron';
import crypto from 'crypto';
import net from 'net';
import http from 'http';
import path from 'path';
import fs from 'fs';

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
// How long to wait for the user to finish signing in in the browser
const AUTH_TIMEOUT_MS = 5 * 60 * 1000;

// The Desktop Client ID and Secret are generated into env.ts during build
import { CLIENT_ID, CLIENT_SECRET } from './env';

function generateCodeVerifier() { 
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

function getTokensPath() {
  return path.join(app.getPath('userData'), 'google_refresh_token.enc');
}

export async function clearAuthTokens() {
  const tokenPath = getTokensPath();
  if (fs.existsSync(tokenPath)) {
    fs.unlinkSync(tokenPath);
  }
}

// Returns false when the token could not be saved, so the caller can tell
// the user they will have to sign in again next time. The token is never
// written unencrypted.
async function storeRefreshToken(token: string): Promise<boolean> {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('safeStorage not available, refresh token not stored');
    return false;
  }
  try {
    const encrypted = safeStorage.encryptString(token);
    fs.writeFileSync(getTokensPath(), encrypted, { mode: 0o600 });
    return true;
  } catch (e) {
    console.error('Failed to store refresh token', e);
    return false;
  }
}

export interface DesktopAuthResult {
  access_token: string;
  user: any;
  // False when the sign-in could not be remembered for the next launch
  rememberedLogin: boolean;
}

async function getStoredRefreshToken(): Promise<string | null> {
  const tokenPath = getTokensPath();
  if (!fs.existsSync(tokenPath)) return null;
  
  try {
    const encrypted = fs.readFileSync(tokenPath);
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(encrypted);
    }
  } catch (e) {
    console.error('Failed to decrypt stored token', e);
  }
  return null;
}

export async function refreshAccessToken(): Promise<DesktopAuthResult | null> {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      })
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${await response.text()}`);
    }

    const data = await response.json();
    // Google usually keeps the existing refresh token, which is already stored
    const rememberedLogin = data.refresh_token ? await storeRefreshToken(data.refresh_token) : true;

    const user = await fetchUserInfo(data.access_token);
    return { access_token: data.access_token, user, rememberedLogin };
  } catch (e) {
    console.error(e);
    await clearAuthTokens(); // Token likely revoked or invalid
    return null;
  }
}

async function fetchUserInfo(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    image: data.picture
  };
}

export async function startGoogleAuthFlow(): Promise<DesktopAuthResult> {
  if (!CLIENT_ID) {
    throw new Error("AUTH_GOOGLE_DESKTOP_ID is not configured.");
  }

  // Try to use existing refresh token first to avoid browser prompt
  const existingSession = await refreshAccessToken();
  if (existingSession) {
    return existingSession;
  }

  const port = await findFreePort();
  const redirectUri = `http://127.0.0.1:${port}`;
  
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);

  const authUrl = new URL(GOOGLE_OAUTH_URL);
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile https://www.googleapis.com/auth/drive.file');
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  // Ties the callback to this sign-in attempt
  const state = crypto.randomBytes(16).toString('base64url');
  authUrl.searchParams.set('state', state);

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error: Error | null, result?: DesktopAuthResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      server.close();
      if (error) reject(error);
      else resolve(result!);
    };

    // Give up if the user never completes the browser sign-in
    const timeout = setTimeout(() => {
      finish(new Error('Google sign-in timed out. Please try again.'));
    }, AUTH_TIMEOUT_MS);

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url || '', `http://127.0.0.1:${port}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      // Only the OAuth callback itself is handled; browsers also ask for favicons etc.
      if (url.pathname !== '/' || (!code && !error)) {
        res.writeHead(404).end();
        return;
      }
      if (url.searchParams.get('state') !== state) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
          .end(callbackPage('Authentication Failed', 'This sign-in link is not valid. Please try again from the app.'));
        return;
      }

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          .end(callbackPage('Authentication Failed', error));
        finish(new Error(`Google Auth Error: ${error}`));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        .end(callbackPage('Authentication Successful!', 'You can close this tab and return to the application.'));

      try {
        // Exchange code
        const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            code: code!,
            code_verifier: verifier
          })
        });

        if (!tokenRes.ok) {
          throw new Error(`Token exchange failed: ${await tokenRes.text()}`);
        }

        const tokenData = await tokenRes.json();

        const rememberedLogin = tokenData.refresh_token
          ? await storeRefreshToken(tokenData.refresh_token)
          : false;

        const user = await fetchUserInfo(tokenData.access_token);
        finish(null, { access_token: tokenData.access_token, user, rememberedLogin });
      } catch (e) {
        finish(e instanceof Error ? e : new Error(String(e)));
      }
    });

    server.on('error', (e) => finish(e));
    server.listen(port, '127.0.0.1', () => {
      shell.openExternal(authUrl.toString());
    });
  });
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function callbackPage(title: string, message: string) {
  return `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><script>window.close()</script>`;
}
