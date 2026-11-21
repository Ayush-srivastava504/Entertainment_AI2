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
  return cached(`characters:slug:v3:${slug}`, 3600, async () => {
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
    const row = await cached(`characters:id:v3:${id}`, 3600, async () => {
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

/** id -> slug of the public profile (thin or hidden ones are left out), for linking from the static leads list. Fails soft to an empty map. */
export async function getDbSlugsByIds(ids: number[], opts: { strict?: boolean } = {}): Promise<Map<number, string>> {
  if (!ids.length) return new Map();
  try {
    const rows = await cached(`characters:slugs:v3:${ids.join(",")}`, 3600, async () => {
      const { rows } = await getPool().query(`select id, slug from anime_characters where id = any($1::bigint[]) and ${indexableCharacterSql()}`, [ids]);
      return rows as { id: string | number; slug: string }[];
    });
    return new Map(rows.map((r) => [Number(r.id), r.slug]));
  } catch (err) {
    console.error("character slugs query failed:", err);
    // strict: a DB error must not look like "no profile" (that would 404 a lead).
    if (opts.strict) throw err;
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

/**
 * One rule decides whether a character profile exists publicly, and every
 * query below (indexableCharacterSql) and the page (isPublicCharacter) use
 * it, so they can never disagree. A profile that fails it returns 404, is
 * left out of the sitemap, and no list on the site links to it; it appears
 * again everywhere by itself once it passes.
 *
 * Two conditions:
 *  - grounded: an official description (AniList "about") of 500+ characters.
 *    Without one, any longer text would have to be invented.
 *  - substantial: description + overview of 1,900+ characters together,
 *    so the page has 500+ words of main text. Measured on every profile of
 *    the 2026-11-22 build: at 1,900+ the shortest page had 554 words; below
 *    it, page length varies with the number of voice actors and appearances
 *    and 16 profiles between 1,300 and 1,884 characters came out at 388-499.
 *    The overview is written by `crawler/characters-sync.mjs --ai-only`
 *    from the description and facts, for grounded characters only.
 * scripts/seo-gate.mjs then checks every listed profile really has 500+ words.
 */
export const MIN_CHARACTER_ABOUT_CHARS = 500;
export const MIN_CHARACTER_TEXT_CHARS = 1900;

/** SQL condition for a public profile; `a` is the table alias ("" for none). */
export function indexableCharacterSql(a = ""): string {
  const c = a ? `${a}.` : "";
  const about = `length(trim(coalesce(${c}about, '')))`;
  const overview = `length(trim(coalesce(${c}overview, '')))`;
  return `${c}noindex = false and ${about} >= ${MIN_CHARACTER_ABOUT_CHARS} and ${about} + ${overview} >= ${MIN_CHARACTER_TEXT_CHARS}`;
}

export function isThinCharacter(c: Pick<DbCharacter, "about" | "overview">): boolean {
  const about = (c.about ?? "").trim().length;
  const overview = (c.overview ?? "").trim().length;
  return about < MIN_CHARACTER_ABOUT_CHARS || about + overview < MIN_CHARACTER_TEXT_CHARS;
}

/** True when the profile may be shown, linked and indexed. */
export function isPublicCharacter(c: Pick<DbCharacter, "about" | "overview" | "noindex">): boolean {
  return !c.noindex && !isThinCharacter(c);
}

export const getTrendingCharacters = (limit = 60) =>
  list(
    `characters:trending:v3:${limit}`,
    `select * from anime_characters where trending_rank is not null and ${indexableCharacterSql()} order by trending_rank limit $1`,
    [limit],
  );

export const getPopularCharacters = (limit = 100) =>
  list(
    `characters:popular:v3:${limit}`,
    `select * from anime_characters where popular_rank is not null and ${indexableCharacterSql()} order by popular_rank limit $1`,
    [limit],
  );

/** Related characters from the same anime, for internal linking. */
export async function getRelatedCharacters(c: DbCharacter, limit = 6): Promise<DbCharacter[]> {
  const animeIds = c.anime.map((a) => a.id);
  if (!animeIds.length) return [];
  return list(
    `characters:related:v3:${c.id}:${limit}`,
    `select * from anime_characters
      where id <> $1 and ${indexableCharacterSql()}
        and exists (select 1 from jsonb_array_elements(anime) a where (a->>'id')::int = any($2::int[]))
      order by favourites desc limit $3`,
    [c.id, animeIds, limit],
  );
}

/** For the sitemap: throws on DB failure so a blip is not cached as an empty list. */
export async function getCharacterSitemapRows(): Promise<{ slug: string; updatedAt: Date }[]> {
  const { rows } = await getPool().query(
    `select slug, updated_at from anime_characters
     where ${indexableCharacterSql()}
     order by favourites desc`,
  );
  return rows.map((r: any) => ({ slug: r.slug, updatedAt: r.updated_at }));
}

/**
 * Indexable character profiles that appear in a given anime (anime.id), for
 * the "Characters" links on its ending-explained guide. Matches on the
 * AniList id stored in each character's appearances (anime.raw.id for
 * AniList-sourced rows), falling back to an exact title match. Only public
 * profiles are returned, so guides never link to a 404. Fails soft to [] (the guide renders without the section).
 */
export async function getCharactersForAnime(
  animeId: string,
  limit = 12,
): Promise<{ name: string; slug: string; image: string | null }[]> {
  try {
    return await cached(`characters:for-anime:v3:${animeId}:${limit}`, 3600, async () => {
      const { rows } = await getPool().query(
        `select c.name, c.slug, c.image_url
           from anime_characters c
           join anime a on a.id = $1
          where ${indexableCharacterSql("c")}
            and (case when a.source = 'anilist' and a.raw->>'id' ~ '^[0-9]+$'
                      then c.anime @> jsonb_build_array(jsonb_build_object('id', (a.raw->>'id')::bigint))
                      else false end
                 or c.anime @> jsonb_build_array(jsonb_build_object('title', a.title))
                 or (a.title_english is not null
                     and c.anime @> jsonb_build_array(jsonb_build_object('title', a.title_english))))
          order by c.favourites desc
          limit $2`,
        [animeId, limit],
      );
      return rows.map((r: any) => ({ name: r.name, slug: r.slug, image: r.image_url ?? null }));
    });
  } catch (err) {
    console.error("characters for anime query failed:", err);
    return [];
  }
}
