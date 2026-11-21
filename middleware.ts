import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /admin routes
  const isProtected = pathname.startsWith("/admin");
  if (!isProtected) return NextResponse.next();

  // Check for session cookie presence (lightweight guard)
  // Full validation happens inside each route handler
  const hasSession = request.cookies.has("erp_session");
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
