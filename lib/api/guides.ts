/*
Queries that exist for internal linking.

Before this, /ending-explained listed only the 60 newest movies + 60 newest
anime, and a guide page linked to just 4 "similar" titles. Every other guide
(thousands) had no crawlable inbound link except the sitemap, which is
exactly the profile of "Discovered - currently not indexed". Two fixes:

 1. getGuidesPage(): paginated hub, so every guide is reachable by plain
    <a href> links from /ending-explained?page=N.
 2. getAdjacentGuides(): previous/next guide, so every guide has at least
    two inbound links from other guides, forming one crawlable chain.
*/

import { getPool } from "@/lib/db";
import { cached } from "@/lib/cache";
import { buildMediaSlug } from "@/lib/slug";
import type { MediaItem, MediaKind } from "@/lib/api/normalize";

export const GUIDES_PER_PAGE = 48;

export type GuideType = "all" | "movie" | "anime";

function rowToCard(row: any): MediaItem {
  const kind = row.kind as MediaKind;
  const description = String(row.description ?? "").replace(/\s+/g, " ").trim().slice(0, 180);
  return {
    id: String(row.id),
    slug: row.slug || buildMediaSlug(row.title, row.year, String(row.id)),
    kind,
    title: row.title,
    description,
    posterUrl: row.poster_url ?? undefined,
    year: row.year ?? undefined,
    score: row.score !== null && row.score !== undefined ? Number(row.score) : undefined,
    genres: Array.isArray(row.genres) ? row.genres.filter((g: any) => typeof g === "string") : [],
    likes: 0,
    endingExplainedPublishedAt: row.published_at ? new Date(row.published_at).toISOString() : undefined,
  };
}

const MOVIE_SELECT = `select 'movie'::text as kind, id, slug, title, year, score, poster_url, genres,
  description, ending_explained_published_at as published_at
  from movies where noindex = false and ending_explained_content is not null`;
const ANIME_SELECT = `select 'anime'::text as kind, id, slug, coalesce(title_english, title) as title, year, score, poster_url, genres,
  synopsis as description, ending_explained_published_at as published_at
  from anime where noindex = false and ending_explained_content is not null`;

function source(type: GuideType) {
  if (type === "movie") return MOVIE_SELECT;
  if (type === "anime") return ANIME_SELECT;
  return `${MOVIE_SELECT} union all ${ANIME_SELECT}`;
}

export async function countGuides(type: GuideType = "all"): Promise<number> {
  return cached(`guides:count:${type}`, 600, async () => {
    try {
      const { rows } = await getPool().query(`select count(*)::int as n from (${source(type)}) g`);
      return rows[0]?.n ?? 0;
    } catch (err) {
      console.error("guide count query failed:", err);
      return 0;
    }
  });
}

/** Newest-first page of published guides (light columns only, no content jsonb). */
export async function getGuidesPage(type: GuideType, page: number, perPage = GUIDES_PER_PAGE): Promise<MediaItem[]> {
  const offset = Math.max(0, (page - 1) * perPage);
  return cached(`guides:page:${type}:${page}:${perPage}`, 600, async () => {
    try {
      const { rows } = await getPool().query(
        `select * from (${source(type)}) g
         order by published_at desc nulls last, id desc
         limit $1 offset $2`,
        [perPage, offset]
      );
      return rows.map(rowToCard);
    } catch (err) {
      console.error("guides page query failed:", err);
      return [];
    }
  });
}

/** Previous (newer) and next (older) published guide in the same table. */
export async function getAdjacentGuides(
  kind: MediaKind,
  id: string
): Promise<{ newer: MediaItem | null; older: MediaItem | null }> {
  return cached(`guides:adjacent:${kind}:${id}`, 3600, async () => {
    try {
      const sel = kind === "movie" ? MOVIE_SELECT : ANIME_SELECT;
      const { rows } = await getPool().query(
        `with ordered as (
           select g.*,
                  lag(to_jsonb(g))  over w as newer_row,
                  lead(to_jsonb(g)) over w as older_row
           from (${sel}) g
           window w as (order by published_at desc nulls last, id desc)
         )
         select newer_row, older_row from ordered where id = $1`,
        [id]
      );
      const r = rows[0];
      return {
        newer: r?.newer_row ? rowToCard(r.newer_row) : null,
        older: r?.older_row ? rowToCard(r.older_row) : null,
      };
    } catch (err) {
      console.error("adjacent guides query failed:", err);
      return { newer: null, older: null };
    }
  });
}
