import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { submitToIndexNow } from "@/lib/indexnow";
import { getBaseUrl } from "@/lib/site";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // Lengths differ → definitely not equal, and comparing mismatched
  // buffer lengths would throw. Still constant-time relative to the
  // configured secret's length, which is what matters here.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Body: { secret, paths?: string[] } — e.g. ["/ending-explained/inception"].
// Revalidates each path, then pings IndexNow with the absolute URLs so
// search engines re-crawl them promptly.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const secret = body.secret;
  const expected = process.env.REVALIDATION_SECRET;

  if (
    !expected ||
    typeof secret !== "string" ||
    !safeEqual(secret, expected)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paths: string[] = (Array.isArray(body.paths) ? body.paths : [])
    .filter((p: unknown): p is string => typeof p === "string" && p.length > 0)
    .map((p: string) => (p.startsWith("/") ? p : `/${p}`));

  for (const path of paths) {
    revalidatePath(path);
  }

  const baseUrl = getBaseUrl();
  const indexNow = await submitToIndexNow(paths.map((p) => `${baseUrl}${p}`));

  return NextResponse.json({
    revalidated: true,
    now: new Date().toISOString(),
    paths,
    indexNow,
  });
}
