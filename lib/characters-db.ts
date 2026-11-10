/*
Anime character profiles stored in Supabase (table `anime_characters`, filled
by crawler/characters-sync.mjs). Reads fail soft: any DB error resolves to an
empty list / null so a hiccup shows the Jikan fallback instead of a 500, and
errors are never cached as "no such character".
*/

import { getPool } from "@/lib/db";
import { cached } from "@/lib/cache";

export interface DbAppearance {
  id: number;
  title: string;
  image: string | null;
  year: number | null;
  format: string | null;
  score: number | null;
  role: string | null;
}

export interface DbCharacter {
  id: number;
  slug: string;
  name: string;
  nameNative: string | null;
  aliases: string[];
  image: string | null;
  gender: string | null;
  age: string | null;
  birthday: string | null;
  bloodType: string | null;
  favourites: number;
  about: string | null;
  overview: string | null;
  anime: DbAppearance[];
  voiceActors: { name: string; image: string | null; language: string }[];
  collections: string[];
  popularRank: number | null;
  trendingRank: number | null;
  sourceUrl: string | null;
  noindex: boolean;
  updatedAt: Date;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToCharacter(r: any): DbCharacter {
  return {
    id: Number(r.id),
    slug: r.slug,
    name: r.name,
    nameNative: r.name_native,
    aliases: r.aliases ?? [],
    image: r.image_url,
    gender: r.gender,
    age: r.age,
    birthday: r.birthday,
    bloodType: r.blood_type,
    favourites: r.favourites ?? 0,
    about: r.about,
    overview: r.overview,
    anime: r.anime ?? [],
    voiceActors: r.voice_actors ?? [],
    collections: r.collections ?? [],
    popularRank: r.popular_rank,
    trendingRank: r.trending_rank,
    sourceUrl: r.source_url,
    noindex: r.noindex,
    updatedAt: r.updated_at,
  };
}

export async function getDbCharacterBySlug(slug: string): Promise<DbCharacter | null> {
  return cached(`characters:slug:${slug}`, 3600, async () => {
    // Throws on DB failure (nothing cached, page errors and is retried).
    const { rows } = await getPool().query(`select * from anime_characters where slug = $1`, [slug]);
    return rows[0] ? rowToCharacter(rows[0]) : null;
  }).catch((err) => {
    console.error("character by slug query failed:", err);
    throw err;
  });
}

/**
Old profile URLs were "/anime-characters/<anilistId>-<name>". Profiles now live at a
name-only slug ("/anime-characters/mikasa-ackerman"). Given an old-style slug, return
the new one so the page can 301 to it, or null if it isn't a legacy URL of a
saved profile. The name part must match exactly, so a Jikan/MAL id that happens
to equal an AniList id is never hijacked.
*/
export async function getLegacyCharacterRedirect(slug: string): Promise<string | null> {
  const m = /^(\d+)(?:-(.+))?$/.exec(slug);
  if (!m) return null;
  const id = Number(m[1]);
  try {
    const row = await cached(`characters:id:${id}`, 3600, async () => {
      const { rows } = await getPool().query(`select slug, name from anime_characters where id = $1`, [id]);
      return (rows[0] as { slug: string; name: string } | undefined) ?? null;
    });
    if (!row || row.slug === slug) return null;
    const legacyName = row.name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const legacy = legacyName ? `${id}-${legacyName}` : String(id);
    return slug === legacy || slug === String(id) ? row.slug : null;
  } catch (err) {
    console.error("legacy character lookup failed:", err);
    return null;
  }
}

/** id -> current profile slug, for linking from the static leads list. Fails soft to an empty map. */
export async function getDbSlugsByIds(ids: number[]): Promise<Map<number, string>> {
  if (!ids.length) return new Map();
  try {
    const rows = await cached(`characters:slugs:${ids.join(",")}`, 3600, async () => {
      const { rows } = await getPool().query(`select id, slug from anime_characters where id = any($1::bigint[])`, [ids]);
      return rows as { id: string | number; slug: string }[];
    });
    return new Map(rows.map((r) => [Number(r.id), r.slug]));
  } catch (err) {
    console.error("character slugs query failed:", err);
    return new Map();
  }
}

async function list(key: string, sql: string, params: unknown[] = []): Promise<DbCharacter[]> {
  try {
    return await cached(key, 3600, async () => {
      const { rows } = await getPool().query(sql, params);
      return rows.map(rowToCharacter);
    });
  } catch (err) {
    console.error(`${key} query failed:`, err);
    return [];
  }
}

export const getTrendingCharacters = (limit = 60) =>
  list(
    `characters:trending:${limit}`,
    `select * from anime_characters where trending_rank is not null and noindex = false order by trending_rank limit $1`,
    [limit],
  );

export const getPopularCharacters = (limit = 100) =>
  list(
    `characters:popular:${limit}`,
    `select * from anime_characters where popular_rank is not null and noindex = false order by popular_rank limit $1`,
    [limit],
  );

/** Related characters from the same anime, for internal linking. */
export async function getRelatedCharacters(c: DbCharacter, limit = 6): Promise<DbCharacter[]> {
  const animeIds = c.anime.map((a) => a.id);
  if (!animeIds.length) return [];
  return list(
    `characters:related:${c.id}:${limit}`,
    `select * from anime_characters
      where id <> $1 and noindex = false
        and exists (select 1 from jsonb_array_elements(anime) a where (a->>'id')::int = any($2::int[]))
      order by favourites desc limit $3`,
    [c.id, animeIds, limit],
  );
}

/** For the sitemap: throws on DB failure so a blip is not cached as an empty list. */
export async function getCharacterSitemapRows(): Promise<{ slug: string; updatedAt: Date }[]> {
  const { rows } = await getPool().query(
    `select slug, updated_at from anime_characters where noindex = false order by favourites desc`,
  );
  return rows.map((r: any) => ({ slug: r.slug, updatedAt: r.updated_at }));
}
