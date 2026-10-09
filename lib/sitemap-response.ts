/*
Shared response wrapper for every sitemap route.

The failure mode this exists for: when Postgres hiccups, the slug queries used
to return [] and the route happily answered "200 OK" with a valid but EMPTY
sitemap. Search Console then reports "Sitemap processed successfully" with 0
discovered pages, and the CDN caches that empty file for an hour. Now a
failure is a real 503 with no-store, so crawlers retry and nothing empty is
ever cached; the previously cached good copy keeps being served meanwhile.
*/
const XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
  "X-Robots-Tag": "noindex",
};

export async function sitemapResponse(build: () => Promise<string | null>): Promise<Response> {
  try {
    const xml = await build();
    if (!xml) return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=0, s-maxage=300" } });
    return new Response(xml, { headers: XML_HEADERS });
  } catch (err) {
    console.error("sitemap build failed:", err);
    return new Response("Sitemap temporarily unavailable", {
      status: 503,
      headers: { "Retry-After": "300", "Cache-Control": "no-store" },
    });
  }
}
