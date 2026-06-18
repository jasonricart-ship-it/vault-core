import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function isPublicPpcRoute(pathname: string) {
  if (pathname === "/vault/ppc") return true;
  return /^\/vault\/ppc\/[^/]+$/.test(pathname);
}

function isProtectedRoute(pathname: string) {
  if (
    pathname === "/dashboard" ||
    pathname === "/register/player" ||
    pathname === "/register/success"
  ) {
    return true;
  }

  if (pathname.startsWith("/vault/ppc") && !isPublicPpcRoute(pathname)) {
    return true;
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard",
    "/vault/ppc/:path*",
    "/register/player",
    "/register/success",
  ],
};
