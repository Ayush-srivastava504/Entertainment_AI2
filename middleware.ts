import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionCookieValue } from "@/lib/admin-auth";
import removed from "@/lib/removed-movie-urls.json";

// Movie guides were removed: answer 410 Gone so Google drops them faster than
// it would for a 404. Never robots-block these paths. Old movie watch-order
// slugs are NOT 410'd: many ("one-piece", "bleach", "jujutsu-kaisen") are the
// slugs the anime watch orders will reuse, so they just 404 until then.
const REMOVED_GUIDES = new Set<string>(removed.endingExplained);
const GONE_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "public, max-age=0, s-maxage=86400",
  "X-Robots-Tag": "noindex",
};

function removedMovieGuide(pathname: string): boolean {
  const m = pathname.match(/^\/ending-explained\/([^/]+)\/?$/);
  if (!m) return false;
  try {
    return REMOVED_GUIDES.has(decodeURIComponent(m[1]));
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/ending-explained/")) {
    if (removedMovieGuide(pathname)) {
      return new Response("410 Gone: this page has been permanently removed.", { status: 410, headers: GONE_HEADERS });
    }
    return NextResponse.next();
  }

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
  matcher: ["/admin/:path*", "/api/admin/:path*", "/ending-explained/:slug"],
};
