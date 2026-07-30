import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { isPublicPath } from "@/lib/public-paths";
import { authConfig } from "@/server/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (!req.auth && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }


  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding",
    "/api/upload",
    "/api/extract-text",
    "/api/trpc/:path*",
  ],
};