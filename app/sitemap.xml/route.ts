import { buildSitemapIndex } from "@/lib/sitemap";
import { sitemapResponse } from "@/lib/sitemap-response";

// Regenerated at most hourly (the DB list is also cached for an hour).
export const revalidate = 3600;

export async function GET() {
  return sitemapResponse(buildSitemapIndex);
}
