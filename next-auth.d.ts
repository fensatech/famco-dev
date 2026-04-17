import "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken: string
    provider: string
    profileId: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    provider?: string
    profileId?: string
  }
}
