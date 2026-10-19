import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "rpihm_session_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to login, static assets, images, and public files
  if (
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // If no session token or invalid length, immediately redirect to /login
  if (!token || typeof token !== "string" || token.length !== 64) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/).*)",
  ],
};