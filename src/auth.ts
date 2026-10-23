import NextAuth, { DefaultSession } from "next-auth"
import Google from "next-auth/providers/google"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    // Set when the Google access token has expired and could not be refreshed
    error?: "AccessTokenExpired" | "RefreshAccessTokenError"
    user: {
      id: string
    } & DefaultSession["user"]
  }

  // Extra fields the desktop provider hands to the jwt callback
  interface User {
    accessToken?: string
    expiresAt?: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    // Access token expiry, in seconds since the epoch
    expiresAt?: number
    error?: "AccessTokenExpired" | "RefreshAccessTokenError"
  }
}

import Credentials from "next-auth/providers/credentials"
import type { Provider } from "next-auth/providers"
import type { JWT } from "next-auth/jwt"

const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

// Packaged desktop builds set DESKTOP_MODE in the Electron main process.
// `npm run dev:desktop` starts `next dev` separately, so development is allowed too.
const isDesktopAuthEnabled =
  process.env.DESKTOP_MODE === "true" || process.env.NODE_ENV === "development"

// Desktop builds pass the desktop client ID as AUTH_GOOGLE_ID; in development it lives in AUTH_GOOGLE_DESKTOP_ID.
const desktopClientId = process.env.AUTH_GOOGLE_DESKTOP_ID || process.env.AUTH_GOOGLE_ID

// Checks the access token with Google and returns the user it belongs to,
// or null if it is invalid, expired, or was issued to a different client.
async function verifyGoogleAccessToken(accessToken: string) {
  const [tokenRes, userRes] = await Promise.all([
    fetch(GOOGLE_TOKENINFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ access_token: accessToken }),
    }),
    fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ])
  if (!tokenRes.ok || !userRes.ok) return null

  const tokenInfo = await tokenRes.json()
  if (!desktopClientId || tokenInfo.aud !== desktopClientId) return null

  const userInfo = await userRes.json()
  if (!userInfo.sub || userInfo.sub !== tokenInfo.sub) return null

  return {
    id: userInfo.sub as string,
    name: userInfo.name as string | undefined,
    email: userInfo.email as string | undefined,
    image: userInfo.picture as string | undefined,
    expiresAt: tokenInfo.exp ? Number(tokenInfo.exp) : undefined,
  }
}

// Exchanges the stored refresh token for a new Google access token (web sign-in).
async function refreshGoogleAccessToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID ?? "",
        client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: token.refreshToken ?? "",
      }),
    })
    const refreshed = await response.json()
    if (!response.ok) throw refreshed

    return {
      ...token,
      accessToken: refreshed.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + Number(refreshed.expires_in),
      // Google only sometimes rotates the refresh token
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    }
  } catch (e) {
    console.error("Failed to refresh Google access token", e)
    return { ...token, error: "RefreshAccessTokenError" }
  }
}

const providers: Provider[] = [
  Google({
    authorization: {
      params: {
        prompt: "consent",
        access_type: "offline",
        response_type: "code",
        scope: "openid email profile https://www.googleapis.com/auth/drive.file"
      }
    }
  }),
]

if (isDesktopAuthEnabled) {
  providers.push(
    Credentials({
      id: "desktop",
      name: "Desktop Local Auth",
      credentials: {
        accessToken: { label: "Access Token", type: "text" },
      },
      async authorize(credentials) {
        const accessToken = credentials?.accessToken
        if (typeof accessToken !== "string" || !accessToken) {
          return null;
        }

        try {
          const user = await verifyGoogleAccessToken(accessToken)
          if (!user) return null

          // accessToken is a temporary prop to pass to the jwt callback
          return { ...user, accessToken };
        } catch (e) {
          console.error("Failed to verify desktop access token", e)
          return null
        }
      }
    })
  )
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  callbacks: {
    async jwt({ token, account, user }) {
      // Persist the OAuth tokens right after a web sign-in
      if (account?.provider === "google" && account.access_token) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token ?? token.refreshToken,
          expiresAt: account.expires_at,
          error: undefined,
        }
      }
      // Desktop credentials flow: Electron holds the refresh token, not the server
      if (user?.accessToken) {
        return {
          ...token,
          accessToken: user.accessToken,
          refreshToken: undefined,
          expiresAt: user.expiresAt,
          error: undefined,
        }
      }

      // Still valid (with a minute of slack)
      if (!token.expiresAt || Date.now() < (token.expiresAt - 60) * 1000) {
        return token
      }
      if (!token.refreshToken) {
        return { ...token, error: "AccessTokenExpired" }
      }
      return refreshGoogleAccessToken(token)
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token from a provider.
      session.accessToken = token.accessToken
      session.error = token.error
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
})
