/*
Queries that feed the homepage and footer link blocks.

Internal linking is the main lever for "Crawled - currently not indexed":
Google only indexes pages it believes are worth keeping, and a page that is
linked from the homepage and from every page's footer is plainly important.
These helpers return small, link-ready lists (title + slug) so those blocks
stay cheap, and a DB failure just drops the block instead of breaking a page.
*/

import { getPool } from "@/lib/db";
import { cached } from "@/lib/cache";
import { buildMediaSlug } from "@/lib/slug";
import { getAllPublishedFranchises } from "@/lib/api/franchises";
import { countGuides } from "@/lib/api/guides";

export interface GuideLink {
  kind: "movie" | "anime";
  slug: string;
  title: string;
  year?: number;
  score?: number;
}

function rowToLink(row: any): GuideLink {
  return {
    kind: row.kind,
    slug: row.slug || buildMediaSlug(row.title, row.year, String(row.id)),
    title: row.title,
    year: row.year ?? undefined,
    score: row.score != null ? Number(row.score) : undefined,
  };
}

/** Highest-rated published guides of one kind. Never caches a failure. */
export async function getTopRatedGuides(kind: "movie" | "anime", limit = 8): Promise<GuideLink[]> {
  try {
    return await cached(`hub:top:${kind}:${limit}`, 1800, async () => {
      const sql =
        kind === "movie"
          ? `select 'movie'::text as kind, id, slug, title, year, score from movies
             where noindex = false and ending_explained_content is not null and score is not null
             order by score desc, vote_count desc nulls last limit $1`
          : `select 'anime'::text as kind, id, slug, coalesce(title_english, title) as title, year, score from anime
             where noindex = false and ending_explained_content is not null and score is not null
             order by score desc, scored_by desc nulls last limit $1`;
      const { rows } = await getPool().query(sql, [limit]);
      return rows.map(rowToLink);
    });
  } catch (err) {
    console.error("top rated guides query failed:", err);
    return [];
  }
}

/** Newest published guides across movies and anime. Never caches a failure. */
export async function getLatestGuideLinks(limit = 6): Promise<GuideLink[]> {
  try {
    return await cached(`hub:latest:${limit}`, 600, async () => {
      const { rows } = await getPool().query(
        `select * from (
           select 'movie'::text as kind, id, slug, title, year, score, ending_explained_published_at as p
             from movies where noindex = false and ending_explained_content is not null
           union all
           select 'anime'::text, id, slug, coalesce(title_english, title), year, score, ending_explained_published_at
             from anime where noindex = false and ending_explained_content is not null
         ) g order by p desc nulls last limit $1`,
        [limit]
      );
      return rows.map(rowToLink);
    });
  } catch (err) {
    console.error("latest guide links query failed:", err);
    return [];
  }
}

export interface HubCounts {
  guides: number;
  movies: number;
  anime: number;
  franchises: number;
}

export async function getHubCounts(): Promise<HubCounts> {
  const [guides, movies, anime, franchises] = await Promise.all([
    countGuides("all"),
    countGuides("movie"),
    countGuides("anime"),
    getAllPublishedFranchises(500).then((f) => f.length),
  ]);
  return { guides, movies, anime, franchises };
}
