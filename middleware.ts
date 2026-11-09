import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionCookieValue } from "@/lib/admin-auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The Android app (user agent contains "Animegirl4uApp") has no admin UI. This is a
  // convenience, not a security control: the admin panel is still password protected.
  if ((req.headers.get("user-agent") || "").includes("Animegirl4uApp")) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Not available in the app." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Login endpoints must stay reachable while logged out.
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const isAuthed = await verifySessionCookieValue(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
  if (isAuthed) return NextResponse.next();

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
