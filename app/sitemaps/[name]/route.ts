import { buildSitemapByName } from "@/lib/sitemap";

export const revalidate = 3600;

// /sitemaps/movies-1.xml, /sitemaps/anime-2.xml, /sitemaps/watch-order.xml, /sitemaps/pages.xml
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!name.endsWith(".xml")) return new Response("Not found", { status: 404 });
  const xml = await buildSitemapByName(name.slice(0, -4));
  if (!xml) return new Response("Not found", { status: 404 });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
