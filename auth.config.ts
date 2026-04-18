import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import Apple from "next-auth/providers/apple"

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    Apple({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
    }),
  ],
  pages: { signIn: "/" },
}
