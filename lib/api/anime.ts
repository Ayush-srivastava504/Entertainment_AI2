/*
This module provides database access functions for anime data stored in
Postgres. Anime is internal source data — this module is only ever
consulted through the merged /ending-explained/[slug] page and its
supporting queries; there is no standalone /anime route anymore.
*/

import { getPool } from "@/lib/db";
import { cached, invalidate } from "@/lib/cache";
import type { EndingExplained, MediaItem } from "@/lib/api/normalize";
import { buildMediaSlug } from "@/lib/slug";

function rowToMedia(row: any): MediaItem {
  const title = row.title_english || row.title;
  return {
    id: String(row.id),
    slug: row.slug || buildMediaSlug(title, row.year, String(row.id)),
    kind: "anime",
    title,
    description: (row.synopsis ?? "A compelling anime pick from the current catalog.")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180),
    posterUrl: row.poster_url ?? undefined,
    year: row.year ?? undefined,
    score: row.score !== null && row.score !== undefined ? Number(row.score) : undefined,
    ratingCount: row.scored_by !== null && row.scored_by !== undefined ? Number(row.scored_by) : undefined,
    genres: row.genres ?? [],
    source: row.source ?? "jikan",
    tags: row.tags ?? [],
    castList: row.cast_list ?? undefined,
    noindex: row.noindex ?? false,
    endingExplained: (row.synopsis_override
      ? { recap: row.synopsis_override, ending: "", themes: "", faq: [] }
      : row.ending_explained_content) as EndingExplained | undefined,
    endingExplainedWordCount: row.ending_explained_word_count ?? undefined,
    endingExplainedPublishedAt: row.ending_explained_published_at
      ? new Date(row.ending_explained_published_at).toISOString()
      : undefined,
    likes: row.likes ?? 0,
  };
}

/**
 * Resolves a /ending-explained/[slug] route param against the anime
 * table, which may be a name-based slug ("attack-on-titan-2013-16498") or,
 * for links crawled/shared before slugs existed, a bare numeric id
 * ("16498"). Only returns rows that have a published Ending Explained
 * guide, since unpublished titles have no public URL to resolve to.
 */
export async function getPublishedAnimeBySlugOrId(
  param: string
): Promise<{ anime: MediaItem; isCanonical: boolean } | null> {
  return cached(`anime:published-slug-or-id:${param}`, 3600, async () => {
    try {
      const { rows } = await getPool().query(
        `select * from anime
         where (slug = $1 or id = $1) and ending_explained_content is not null
         order by (slug = $1) desc limit 1`,
        [param]
      );
      if (!rows[0]) return null;
      const anime = rowToMedia(rows[0]);
      return { anime, isCanonical: anime.slug === param };
    } catch (err) {
      console.error("published anime by slug/id query failed:", err);
      return null;
    }
  });
}

export async function getAnimeRow(id: string): Promise<MediaItem | null> {
  return cached(`anime:id:${id}`, 3600, async () => {
    try {
      const { rows } = await getPool().query("select * from anime where id = $1", [id]);
      return rows[0] ? rowToMedia(rows[0]) : null;
    } catch (err) {
      console.error("anime by id query failed:", err);
      return null;
    }
  });
}

/**
 * Lightweight slug/updated_at list for every *published* anime guide, used
 * to build the ending-explained sitemap.
 */
export async function getPublishedAnimeSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return cached("anime:published-slugs", 3600, async () => {
    try {
      const { rows } = await getPool().query(
        `select id, slug, title, title_english, year, ending_explained_published_at, updated_at
         from anime
         where noindex = false and ending_explained_content is not null
         order by id`
      );
      return rows.map((row: any) => ({
        slug: row.slug || buildMediaSlug(row.title_english || row.title, row.year, String(row.id)),
        updatedAt: row.ending_explained_published_at ?? row.updated_at,
      }));
    } catch (err) {
      console.error("published anime slug list query failed:", err);
      return [];
    }
  });
}

export async function getSimilarAnime(id: string, genres: string[], limit = 6): Promise<MediaItem[]> {
  if (!genres.length) return [];
  return cached(`anime:similar:${id}:${limit}`, 900, async () => {
    try {
      const { rows } = await getPool().query(
        `select *,
                cardinality(array(select unnest(genres) intersect select unnest($1::text[]))) as overlap
         from anime
         where id != $2 and genres && $1::text[] and ending_explained_content is not null
         order by overlap desc, score desc nulls last, scored_by desc nulls last
         limit $3`,
        [genres, id, limit]
      );
      return rows.map(rowToMedia);
    } catch (err) {
      console.error("similar anime query failed:", err);
      return [];
    }
  });
}

export async function searchPublishedAnime(query: string, limit = 12): Promise<MediaItem[]> {
  if (!query.trim()) return [];
  try {
    const { rows } = await getPool().query(
      `select * from anime
       where (title ilike $1 or title_english ilike $1) and ending_explained_content is not null
       order by popularity asc nulls last limit $2`,
      [`%${query.trim()}%`, limit]
    );
    return rows.map(rowToMedia);
  } catch (err) {
    console.error("anime search query failed:", err);
    return [];
  }
}

/** Recently published guides for the homepage / /ending-explained index. */
export async function getRecentPublishedAnime(limit = 12): Promise<MediaItem[]> {
  return cached(`anime:recent-published:${limit}`, 300, async () => {
    try {
      const { rows } = await getPool().query(
        `select * from anime
         where noindex = false and ending_explained_content is not null
         order by ending_explained_published_at desc nulls last limit $1`,
        [limit]
      );
      return rows.map(rowToMedia);
    } catch (err) {
      console.error("recent published anime query failed:", err);
      return [];
    }
  });
}

export async function incrementAnimeLikes(idOrSlug: string): Promise<number | null> {
  const { rows } = await getPool().query<{ likes: number }>(
    `update anime set likes = likes + 1 where slug = $1 or id = $1 returning likes`,
    [idOrSlug]
  );
  if (!rows[0]) return null;
  await invalidate("anime:");
  return rows[0].likes;
}
