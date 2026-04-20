import "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken: string | null
    provider: string
    profileId: string
    tokenExpired: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string | null
    refreshToken?: string
    expiresAt?: number
    provider?: string
    profileId?: string
  }
}
