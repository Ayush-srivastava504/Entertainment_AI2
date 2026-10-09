import { buildSitemapByName } from "@/lib/sitemap";
import { sitemapResponse } from "@/lib/sitemap-response";

export const revalidate = 3600;

// /sitemaps/movies-1.xml, /sitemaps/anime-2.xml, /sitemaps/watch-order.xml, /sitemaps/pages.xml
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!name.endsWith(".xml")) return new Response("Not found", { status: 404 });
  return sitemapResponse(() => buildSitemapByName(name.slice(0, -4)));
}
