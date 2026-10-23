import NextAuth, { DefaultSession } from "next-auth"
import Google from "next-auth/providers/google"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    error?: string
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

import Credentials from "next-auth/providers/credentials"
import type { Provider } from "next-auth/providers"

const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
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
      // Persist the OAuth access_token to the token right after signin
      if (account?.access_token) {
        token.accessToken = account.access_token
      } else if (user && 'accessToken' in user) {
        // Desktop credentials flow
        token.accessToken = (user as any).accessToken;
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token from a provider.
      session.accessToken = token.accessToken as string
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
})
