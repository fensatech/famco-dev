import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

const PUBLIC_PATHS = ["/", "/api/auth"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/", req.url))
  }
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
}
