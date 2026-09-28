import { MetadataRoute } from "next";
import { getPublishedMovieSlugs } from "@/lib/api/movies";
import { getPublishedAnimeSlugs } from "@/lib/api/anime";
import { getPublishedFranchiseSlugs } from "@/lib/api/franchises";
import { getBaseUrl } from "@/lib/site";

const BASE_URL = getBaseUrl();

// Splits the sitemap by content type instead of one giant file: static
// pages, movie Ending Explained guides, anime Ending Explained guides,
// and Watch Order guides. Each section can grow independently (the movie
// catalog alone can run into the thousands) without regenerating or
// re-submitting the others, and keeps any one sitemap file well under
// the 50,000-URL Next.js/search-engine limit.
const SECTIONS = ["static", "movies", "anime", "watch-order"] as const;
type Section = (typeof SECTIONS)[number];

export async function generateSitemaps() {
  return SECTIONS.map((_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const section: Section | undefined = SECTIONS[id];

  if (section === "static") {
    return ["", "/ending-explained", "/watch-order", "/search", "/about"].map((path) => ({
      url: `${BASE_URL}${path}`,
      lastModified: new Date(),
    }));
  }

  if (section === "movies") {
    const slugs = await getPublishedMovieSlugs();
    return slugs.map(({ slug, updatedAt }) => ({
      url: `${BASE_URL}/ending-explained/${slug}`,
      lastModified: updatedAt ?? new Date(),
    }));
  }

  if (section === "anime") {
    const slugs = await getPublishedAnimeSlugs();
    return slugs.map(({ slug, updatedAt }) => ({
      url: `${BASE_URL}/ending-explained/${slug}`,
      lastModified: updatedAt ?? new Date(),
    }));
  }

  if (section === "watch-order") {
    const slugs = await getPublishedFranchiseSlugs();
    return slugs.map(({ slug, updatedAt }) => ({
      url: `${BASE_URL}/watch-order/${slug}`,
      lastModified: updatedAt ?? new Date(),
    }));
  }

  return [];
}
