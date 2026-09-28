/*
This module provides database access functions for movie data stored in
Postgres. Movies are internal source data — this module is only ever
consulted through the merged /ending-explained/[slug] page and its
supporting queries; there is no standalone /movies route anymore.
*/

import { getPool } from "@/lib/db";
import { cached, invalidate } from "@/lib/cache";
import type { EndingExplained, MediaItem } from "@/lib/api/normalize";
import { buildMediaSlug } from "@/lib/slug";

function normalizeWatchProviders(value: any) {
  if (!value || typeof value !== "object") return null;
  return {
    region: typeof value.region === "string" ? value.region : null,
    link: typeof value.link === "string" ? value.link : null,
    flatrate: Array.isArray(value.flatrate) ? value.flatrate : [],
    rent: Array.isArray(value.rent) ? value.rent : [],
    buy: Array.isArray(value.buy) ? value.buy : [],
  };
}

function rowToMedia(row: any): MediaItem {
  return {
    id: String(row.id),
    slug: row.slug || buildMediaSlug(row.title, row.year, String(row.id)),
    kind: "movie",
    title: row.title,
    description: (row.description ?? row.tagline ?? "A notable movie pick from the current catalog.")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180),
    posterUrl: row.poster_url ?? undefined,
    year: row.year ?? undefined,
    score: row.score !== null && row.score !== undefined ? Number(row.score) : undefined,
    ratingCount: row.vote_count !== null && row.vote_count !== undefined ? Number(row.vote_count) : undefined,
    genres: Array.isArray(row.genres) ? row.genres.filter((genre: any) => typeof genre === "string") : [],
    source: "tmdb",
    watchProviders: normalizeWatchProviders(row.watch_providers),
    tags: Array.isArray(row.tags) ? row.tags.filter((tag: any) => typeof tag === "string") : [],
    castList: Array.isArray(row.cast_list) ? row.cast_list.filter((member: any) => member?.name) : undefined,
    noindex: row.noindex ?? false,
    endingExplained: (row.synopsis_override
      ? { recap: row.synopsis_override, ending: "", themes: "", faq: [] }
      : row.ending_explained_content && typeof row.ending_explained_content === "object"
        ? { ...row.ending_explained_content, faq: Array.isArray(row.ending_explained_content.faq) ? row.ending_explained_content.faq : [] }
        : undefined) as EndingExplained | undefined,
    endingExplainedWordCount: row.ending_explained_word_count ?? undefined,
    endingExplainedPublishedAt: row.ending_explained_published_at
      ? new Date(row.ending_explained_published_at).toISOString()
      : undefined,
    likes: row.likes ?? 0,
  };
}

/**
 * Resolves a /ending-explained/[slug] route param against the movies
 * table, which may be a name-based slug ("the-matrix-1999-603") or, for
 * links crawled/shared before slugs existed, a bare numeric id ("603").
 * Only returns rows that have a published Ending Explained guide, since
 * unpublished titles have no public URL to resolve to.
 */
export async function getPublishedMovieBySlugOrId(
  param: string
): Promise<{ movie: MediaItem; isCanonical: boolean } | null> {
  return cached(`movies:published-slug-or-id:${param}`, 3600, async () => {
    try {
      const { rows } = await getPool().query(
        `select * from movies
         where (slug = $1 or id = $1) and ending_explained_content is not null
         order by (slug = $1) desc limit 1`,
        [param]
      );
      if (!rows[0]) return null;
      const movie = rowToMedia(rows[0]);
      return { movie, isCanonical: movie.slug === param };
    } catch (err) {
      console.error("published movie by slug/id query failed:", err);
      return null;
    }
  });
}

export async function getMovieRow(id: string): Promise<MediaItem | null> {
  return cached(`movies:id:${id}`, 3600, async () => {
    try {
      const { rows } = await getPool().query("select * from movies where id = $1", [id]);
      return rows[0] ? rowToMedia(rows[0]) : null;
    } catch (err) {
      console.error("movie by id query failed:", err);
      return null;
    }
  });
}

/**
 * Lightweight slug/updated_at list for every *published* movie guide, used
 * to build the ending-explained sitemap. Intentionally selects only a few
 * columns (not `select *`) since this can run over thousands of rows.
 */
export async function getPublishedMovieSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return cached("movies:published-slugs", 3600, async () => {
    try {
      const { rows } = await getPool().query(
        `select id, slug, title, year, ending_explained_published_at, updated_at
         from movies
         where noindex = false and ending_explained_content is not null
         order by id`
      );
      return rows.map((row: any) => ({
        slug: row.slug || buildMediaSlug(row.title, row.year, String(row.id)),
        updatedAt: row.ending_explained_published_at ?? row.updated_at,
      }));
    } catch (err) {
      console.error("published movie slug list query failed:", err);
      return [];
    }
  });
}

export async function getSimilarMovies(id: string, genres: string[], limit = 6): Promise<MediaItem[]> {
  if (!genres.length) return [];
  return cached(`movies:similar:${id}:${limit}`, 900, async () => {
    try {
      const { rows } = await getPool().query(
        // Content-based similarity: rank by how many genres overlap with the
        // source title (array intersection), then by score/vote_count as
        // tiebreakers. Only surfaces titles that have their own published
        // page to link to.
        `select *,
                cardinality(array(select unnest(genres) intersect select unnest($1::text[]))) as overlap
         from movies
         where id != $2 and genres && $1::text[] and ending_explained_content is not null
         order by overlap desc, score desc nulls last, vote_count desc nulls last
         limit $3`,
        [genres, id, limit]
      );
      return rows.map(rowToMedia);
    } catch (err) {
      console.error("similar movies query failed:", err);
      return [];
    }
  });
}

export async function searchPublishedMovies(query: string, limit = 12): Promise<MediaItem[]> {
  if (!query.trim()) return [];
  try {
    const { rows } = await getPool().query(
      `select * from movies
       where title ilike $1 and ending_explained_content is not null
       order by watchers desc nulls last limit $2`,
      [`%${query.trim()}%`, limit]
    );
    return rows.map(rowToMedia);
  } catch (err) {
    console.error("movie search query failed:", err);
    return [];
  }
}

/** Recently published guides for the homepage / /ending-explained index. */
export async function getRecentPublishedMovies(limit = 12): Promise<MediaItem[]> {
  return cached(`movies:recent-published:${limit}`, 300, async () => {
    try {
      const { rows } = await getPool().query(
        `select * from movies
         where noindex = false and ending_explained_content is not null
         order by ending_explained_published_at desc nulls last limit $1`,
        [limit]
      );
      return rows.map(rowToMedia);
    } catch (err) {
      console.error("recent published movies query failed:", err);
      return [];
    }
  });
}

export async function incrementMovieLikes(idOrSlug: string): Promise<number | null> {
  const { rows } = await getPool().query<{ likes: number }>(
    `update movies set likes = likes + 1 where slug = $1 or id = $1 returning likes`,
    [idOrSlug]
  );
  if (!rows[0]) return null;
  await invalidate("movies:");
  return rows[0].likes;
}
