import { buildSitemapIndex } from "@/lib/sitemap";
import { sitemapResponse } from "@/lib/sitemap-response";

// Built per request, never prerendered. With `revalidate` this route was
// frozen at build time on Vercel, so the index kept saying anime-1.xml last
// changed on Nov 15 while the child file listed Nov 24 edits, and Google had
// no reason to re-read it. The CDN still caches it for an hour through the
// s-maxage header in sitemapResponse, and the DB list is cached for an hour.
export const dynamic = "force-dynamic";

export async function GET() {
  return sitemapResponse(buildSitemapIndex);
}
