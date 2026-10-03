import { buildSitemapIndex } from "@/lib/sitemap";

// Regenerated at most hourly (the DB list is also cached for an hour).
export const revalidate = 3600;

export async function GET() {
  const xml = await buildSitemapIndex();
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
