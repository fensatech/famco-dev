import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { createProfile } from "@/lib/db"

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
      if (account) {
        token.accessToken = account.access_token
        token.provider = account.provider
        token.profileId = `${account.provider}:${account.providerAccountId}`
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.provider = token.provider as string
      session.profileId = token.profileId as string
      return session
    },
  },
})
