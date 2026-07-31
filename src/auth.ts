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

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
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
    Credentials({
      id: "desktop",
      name: "Desktop Local Auth",
      credentials: {
        accessToken: { label: "Access Token", type: "text" },
        id: { label: "ID", type: "text" },
        name: { label: "Name", type: "text" },
        email: { label: "Email", type: "text" },
        image: { label: "Image", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.accessToken || !credentials?.id) {
          return null;
        }
        
        // Return a custom user object matching what NextAuth expects
        return {
          id: credentials.id as string,
          name: credentials.name as string,
          email: credentials.email as string,
          image: credentials.image as string,
          accessToken: credentials.accessToken as string, // Temporary prop to pass to jwt callback
        };
      }
    })
  ],
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
