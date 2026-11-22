import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/site";
import { socialMeta } from "@/lib/og";
import { INDEX_ROBOTS } from "@/lib/seo";

const BASE_URL = getBaseUrl();

/** Metadata for page N of the ending explained hub; the canonical is the public URL. */
export function endingHubMetadata(page: number): Metadata {
  const canonical = `${BASE_URL}/ending-explained${page > 1 ? `?page=${page}` : ""}`;
  const title = `Anime Ending Explained Guides${page > 1 ? `, Page ${page}` : ""}`;
  const description =
    "Spoiler-forward breakdowns of how your favorite anime actually end: a recap, the final scene explained, what it means, and a quick FAQ for each title.";
  return {
    title,
    description,
    alternates: { canonical },
    ...socialMeta({
      title: `${title} | Animegirl4u`,
      description,
      path: canonical.replace(BASE_URL, ""),
      cardTitle: "Anime Ending Explained Guides",
      cardSubtitle: "Recap, final scene and what it means",
      badge: "ENDING EXPLAINED",
    }),
    robots: INDEX_ROBOTS,
  };
}
