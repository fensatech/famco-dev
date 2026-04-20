import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { createProfile } from "@/lib/db"

async function refreshGoogleToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: number } | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    })
    const data = await res.json()
    if (!res.ok || data.error) return null
    return {
      accessToken: data.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    }
  } catch {
    return null
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.email) return false
      await createProfile({
        id: `${account.provider}:${account.providerAccountId}`,
        email: user.email,
        first_name: user.name?.split(" ")[0] ?? null,
        last_name: user.name?.split(" ").slice(1).join(" ") ?? null,
      })
      return true
    },
    async jwt({ token, account }) {
      // On first sign-in, store all token data
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at ?? Math.floor(Date.now() / 1000) + 3600
        token.provider = account.provider
        token.profileId = `${account.provider}:${account.providerAccountId}`
        return token
      }

      // If token not expired yet (with 60s buffer), return as-is
      if (typeof token.expiresAt === "number" && Date.now() / 1000 < token.expiresAt - 60) {
        return token
      }

      // Try to refresh the Google access token
      if (token.provider === "google" && token.refreshToken) {
        const refreshed = await refreshGoogleToken(token.refreshToken as string)
        if (refreshed) {
          token.accessToken = refreshed.accessToken
          token.expiresAt = refreshed.expiresAt
          return token
        }
        // Refresh failed — mark token as expired so the client can prompt re-login
        token.accessToken = null
      }

      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | null
      session.provider = token.provider as string
      session.profileId = token.profileId as string
      session.tokenExpired = !token.accessToken
      return session
    },
  },
})
