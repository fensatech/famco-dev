import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/legal/")
  )
}

export default auth((req) => {
  const { pathname } = req.nextUrl

  if (!req.auth && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/", req.url))
  }
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
}
