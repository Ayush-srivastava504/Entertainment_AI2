import { MetadataRoute } from "next";
import { getPublishedMovieSlugs } from "@/lib/api/movies";
import { getPublishedAnimeSlugs } from "@/lib/api/anime";
import { getPublishedFranchiseSlugs } from "@/lib/api/franchises";
import { ENDING_TOPICS, WATCH_ORDER_TOPICS } from "@/lib/topics";
import { getBaseUrl } from "@/lib/site";

const BASE_URL = getBaseUrl();

// Regenerated at most hourly. Without this, Next renders the sitemap once at
// build time and it never learns about guides published afterwards.
export const revalidate = 3600;

// One sitemap on purpose: a single /sitemap.xml matches what robots.txt
// advertises and is well under the 50,000-URL limit. It only lists pages that
// have real content (published guides and published franchises).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [movies, anime, franchises] = await Promise.all([
    getPublishedMovieSlugs(),
    getPublishedAnimeSlugs(),
    getPublishedFranchiseSlugs(),
  ]);

  const newest = (items: { updatedAt: Date }[]) =>
    items.length ? new Date(Math.max(...items.map((i) => new Date(i.updatedAt).getTime()))) : undefined;
  const guides = [...movies, ...anime];

  const entries: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: newest([...guides, ...franchises]), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/ending-explained`, lastModified: newest(guides), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/watch-order`, lastModified: newest(franchises), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/about`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Topic hubs only once they exist as real pages with something on them.
  if (guides.length >= 10) {
    for (const t of ENDING_TOPICS) {
      entries.push({ url: `${BASE_URL}/ending-explained/topic/${t.slug}`, lastModified: newest(guides), changeFrequency: "weekly", priority: 0.6 });
    }
  }
  if (franchises.length >= 5) {
    for (const t of WATCH_ORDER_TOPICS) {
      entries.push({ url: `${BASE_URL}/watch-order/topic/${t.slug}`, lastModified: newest(franchises), changeFrequency: "weekly", priority: 0.6 });
    }
  }

  for (const { slug, updatedAt } of guides) {
    entries.push({ url: `${BASE_URL}/ending-explained/${slug}`, lastModified: updatedAt, changeFrequency: "monthly", priority: 0.8 });
  }
  for (const { slug, updatedAt } of franchises) {
    entries.push({ url: `${BASE_URL}/watch-order/${slug}`, lastModified: updatedAt, changeFrequency: "monthly", priority: 0.8 });
  }
  return entries;
}
