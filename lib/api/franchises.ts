/*
This module provides database access for franchise Watch Order guides
(the `franchises` + `franchise_entries` tables). A franchise only appears
publicly once it is reviewed (needs_review = false) — see
crawler/franchise-watch-order-builder.mjs, which drafts these with AI but
always leaves needs_review = true so a human signs off before publish,
since getting a watch order wrong kills trust in a micro-niche site fast.
*/

import { getPool } from "@/lib/db";
import { cached, invalidate } from "@/lib/cache";
import { getAnimeRow } from "@/lib/api/anime";
import type { MediaItem } from "@/lib/api/normalize";

// The site is anime-only (movies removed 2026-11-13). Every public query below
// also requires media_type <> 'movie': a movie franchise has no resolvable
// entries any more and would render as an empty watch order. Its URL 404s.
// Cache keys carry "v2" so lists cached before this change are not reused.

export interface FranchiseEntry {
  title: MediaItem | null;
  mediaType: "anime";
  orderIndex: number;
  orderType: "release" | "chronological" | "recommended";
  note: string | null;
}

export interface Franchise {
  id: string;
  slug: string;
  title: string;
  intro: string | null;
  metaDescription: string | null;
  mediaType: string;
  noindex: boolean;
  featured: boolean;
  likes: number;
  faq: { q: string; a: string }[];
  publishedAt: string;
  updatedAt: string;
}

function rowToFranchise(row: any): Franchise {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    intro: row.intro,
    metaDescription: row.meta_description,
    mediaType: row.media_type,
    noindex: row.noindex,
    featured: row.featured,
    likes: row.likes ?? 0,
    faq: Array.isArray(row.faq) ? row.faq.filter((x: any) => x?.q && x?.a) : [],
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

export async function getPublishedFranchiseBySlug(slug: string): Promise<Franchise | null> {
  return cached(`franchises:v2:slug:${slug}`, 3600, async () => {
    try {
      const { rows } = await getPool().query(
        `select * from franchises where slug = $1 and needs_review = false and media_type <> 'movie'`,
        [slug]
      );
      return rows[0] ? rowToFranchise(rows[0]) : null;
    } catch (err) {
      // Rethrow: returning null here would be cached for an hour AND turn into
      // a cached 404 page (soft 404 in Search Console) after a transient DB blip.
      console.error("franchise by slug query failed:", err);
      throw err;
    }
  });
}

export async function getFranchiseEntries(
  franchiseId: string,
  orderType: "release" | "chronological" | "recommended" = "release"
): Promise<FranchiseEntry[]> {
  try {
    const { rows } = await getPool().query(
      `select * from franchise_entries
       where franchise_id = $1 and order_type = $2
       order by order_index asc`,
      [franchiseId, orderType]
    );
    const entries = await Promise.all(
      rows.map(async (row: any) => ({
        title: row.media_type === "anime" ? await getAnimeRow(row.title_id) : null,
        mediaType: "anime" as const,
        orderIndex: row.order_index,
        orderType: row.order_type,
        note: row.note,
      }))
    );
    return entries;
  } catch (err) {
    console.error("franchise entries query failed:", err);
    return [];
  }
}

export async function getPublishedFranchiseSlugs(
  opts: { strict?: boolean } = {}
): Promise<{ slug: string; updatedAt: Date }[]> {
  return cached(opts.strict ? "franchises:v2:published-slugs:strict" : "franchises:v2:published-slugs", 3600, async () => {
    try {
      const { rows } = await getPool().query(
        `select slug, updated_at from franchises
         where noindex = false and needs_review = false and media_type <> 'movie'
         order by slug`
      );
      return rows.map((row: any) => ({ slug: row.slug, updatedAt: row.updated_at }));
    } catch (err) {
      console.error("published franchise slug list query failed:", err);
      if (opts.strict) throw err;
      return [];
    }
  });
}

export async function getFeaturedFranchises(limit = 6): Promise<Franchise[]> {
  return cached(`franchises:v2:featured:${limit}`, 300, async () => {
    try {
      const { rows } = await getPool().query(
        `select * from franchises
         where noindex = false and needs_review = false and media_type <> 'movie'
         order by featured desc, published_at desc limit $1`,
        [limit]
      );
      return rows.map(rowToFranchise);
    } catch (err) {
      console.error("featured franchises query failed:", err);
      return [];
    }
  });
}

/** `strict` throws on a DB error instead of returning [] (see getRecentPublishedAnime). */
export async function getAllPublishedFranchises(limit = 200, opts: { strict?: boolean } = {}): Promise<Franchise[]> {
  return cached(`franchises:v2:all:${limit}${opts.strict ? ":strict" : ""}`, 600, async () => {
    try {
      const { rows } = await getPool().query(
        `select * from franchises
         where noindex = false and needs_review = false and media_type <> 'movie'
         order by title asc limit $1`,
        [limit]
      );
      return rows.map(rowToFranchise);
    } catch (err) {
      console.error("all published franchises query failed:", err);
      if (opts.strict) throw err;
      return [];
    }
  });
}

export async function searchPublishedFranchises(query: string, limit = 12): Promise<Franchise[]> {
  if (!query.trim()) return [];
  try {
    const { rows } = await getPool().query(
      `select * from franchises
       where title ilike $1 and noindex = false and needs_review = false and media_type <> 'movie'
       order by title asc limit $2`,
      [`%${query.trim()}%`, limit]
    );
    return rows.map(rowToFranchise);
  } catch (err) {
    console.error("franchise search query failed:", err);
    return [];
  }
}

/**
 * Looks up the published franchise (if any) a given anime title
 * belongs to, so the Ending Explained page for that title can link over
 * to its Watch Order guide — see the cross-link on
 * app/ending-explained/[slug]/page.tsx.
 */
export async function getFranchiseForTitle(
  mediaType: "anime",
  titleId: string
): Promise<{ id: string; slug: string; title: string } | null> {
  return cached(`franchises:v2:for-title:${mediaType}:${titleId}`, 3600, async () => {
    try {
      const { rows } = await getPool().query(
        `select f.id, f.slug, f.title
         from franchise_entries fe
         join franchises f on f.id = fe.franchise_id
         where fe.media_type = $1 and fe.title_id = $2
           and f.noindex = false and f.needs_review = false and f.media_type <> 'movie'
         limit 1`,
        [mediaType, titleId]
      );
      return rows[0] ?? null;
    } catch (err) {
      console.error("franchise for title query failed:", err);
      return null;
    }
  });
}

export async function incrementFranchiseLikes(slug: string): Promise<number | null> {
  const { rows } = await getPool().query<{ likes: number }>(
    `update franchises set likes = likes + 1 where slug = $1 returning likes`,
    [slug]
  );
  if (!rows[0]) return null;
  await invalidate("franchises:");
  return rows[0].likes;
}
