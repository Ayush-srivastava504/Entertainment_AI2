/*
Syncs anime character profiles from AniList into the `anime_characters` table
in Supabase, for the /characters pages.

  npm run crawl:characters                 # fetch + save (needs DATABASE_URL)
  npm run crawl:characters -- --ai         # also write a spoiler-free overview per character (needs GEMINI_API_KEY)
  npm run crawl:characters -- --ai-only    # only (re)write missing overviews for rows already saved
  npm run crawl:characters -- --dry-run    # fetch and print, save nothing
  npm run crawl:characters -- --popular=100 --trending-anime=30 --trending=60

Sets collected (a character can be in several):
  popular   top N by AniList favourites
  trending  main characters of the currently trending TV anime
  lead      the female leads already listed in lib/data/trending-leads.json

Run with: node --env-file=.env crawler/characters-sync.mjs
*/
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, recordSync } from "./db.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const POPULAR = Number(args.popular || 100);
const TRENDING_ANIME = Number(args["trending-anime"] || 30);
const TRENDING_MAX = Number(args.trending || 60);
const DRY = !!args["dry-run"];
const AI = !!args.ai || !!args["ai-only"];
const AI_ONLY = !!args["ai-only"];

const API = "https://graphql.anilist.co";
const GAP_MS = 900;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;

async function gql(query, variables, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const wait = last + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query, variables }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) return json.data;
      }
      if (res.status === 429) await sleep((Number(res.headers.get("retry-after")) || 30) * 1000);
      else if (res.status < 500 && res.status !== 200) return null;
    } catch {
      /* network blip: retry */
    }
    await sleep(2000 * (i + 1));
  }
  return null;
}

const POPULAR_Q = `
query ($page: Int, $per: Int) {
  Page(page: $page, perPage: $per) { characters(sort: FAVOURITES_DESC) { id } }
}`;

const TRENDING_ANIME_Q = `
query ($page: Int) {
  Page(page: $page, perPage: 30) {
    media(type: ANIME, sort: TRENDING_DESC, isAdult: false, format_in: [TV, TV_SHORT, ONA]) {
      id
      characters(role: MAIN, sort: FAVOURITES_DESC, perPage: 3) { nodes { id } }
    }
  }
}`;

const DETAIL_Q = `
query ($id: Int) {
  Character(id: $id) {
    id
    siteUrl
    name { full native alternative }
    image { large }
    gender
    age
    dateOfBirth { month day }
    bloodType
    favourites
    description(asHtml: false)
    media(perPage: 10, sort: POPULARITY_DESC, type: ANIME) {
      edges {
        characterRole
        node { id title { romaji english } coverImage { large } seasonYear format averageScore }
        # One field, all languages, each tagged with languageV2. (Two aliases of voiceActors with
        # different language args do NOT work: AniList applies the last argument set to both.)
        voiceActors(sort: RELEVANCE) { name { full } image { medium } languageV2 }
      }
    }
  }
}`;

/** Strip AniList markup and spoiler blocks so it is safe to show as plain text. */
function clean(text, max) {
  if (!text) return null;
  const s = text
    .replace(/~!([\s\S]*?)!~/g, "") // spoilers
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/(\*\*|__|~~)/g, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!s) return null;
  return s.length > max ? `${s.slice(0, max).replace(/\s+\S*$/, "")}…` : s;
}

function slugify(id, name) {
  const s = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s ? `${id}-${s}` : String(id);
}

/* ---------------- 1. collect ids ---------------- */
async function collectIds() {
  const popular = [];
  for (let page = 1; popular.length < POPULAR; page++) {
    const d = await gql(POPULAR_Q, { page, per: 50 });
    const rows = d?.Page?.characters ?? [];
    if (!rows.length) break;
    for (const c of rows) if (popular.length < POPULAR && !popular.includes(c.id)) popular.push(c.id);
  }

  const trending = [];
  let seenAnime = 0;
  for (let page = 1; seenAnime < TRENDING_ANIME && trending.length < TRENDING_MAX; page++) {
    const d = await gql(TRENDING_ANIME_Q, { page });
    const media = d?.Page?.media ?? [];
    if (!media.length) break;
    for (const m of media) {
      if (seenAnime++ >= TRENDING_ANIME) break;
      for (const c of m.characters?.nodes ?? []) if (!trending.includes(c.id) && trending.length < TRENDING_MAX) trending.push(c.id);
    }
  }

  let leads = [];
  try {
    const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib", "data", "trending-leads.json");
    leads = JSON.parse(await readFile(file, "utf8")).items.map((l) => l.character.id);
  } catch {
    /* leads file optional */
  }
  return { popular, trending, leads };
}

/* ---------------- 2. fetch detail ---------------- */
function toRow(c, { popularRank, trendingRank, collections }) {
  const dob = c.dateOfBirth?.month && c.dateOfBirth?.day ? c.dateOfBirth : null;
  const anime = (c.media?.edges ?? []).map((e) => ({
    id: e.node.id,
    title: e.node.title.english || e.node.title.romaji,
    image: e.node.coverImage?.large ?? null,
    year: e.node.seasonYear ?? null,
    format: e.node.format ?? null,
    score: e.node.averageScore ? e.node.averageScore / 10 : null,
    role: e.characterRole ?? null,
  }));
  // Voice actors: Japanese and English, de-duplicated by name.
  const va = new Map();
  for (const e of c.media?.edges ?? []) {
    for (const v of e.voiceActors ?? []) {
      const lang = v.languageV2;
      if (lang !== "Japanese" && lang !== "English") continue;
      const k = `${lang}:${v.name.full}`;
      if (!va.has(k)) va.set(k, { name: v.name.full, image: v.image?.medium ?? null, language: lang });
    }
  }
  return {
    id: c.id,
    slug: slugify(c.id, c.name.full),
    name: c.name.full,
    name_native: c.name.native ?? null,
    aliases: (c.name.alternative ?? []).filter(Boolean).slice(0, 8),
    image_url: c.image?.large ?? null,
    gender: c.gender ?? null,
    age: c.age ?? null,
    birthday: dob ? `${dob.month}/${dob.day}` : null,
    blood_type: c.bloodType ?? null,
    favourites: c.favourites ?? 0,
    about: clean(c.description, 3000),
    anime,
    // Japanese first, then English; a couple of each is plenty for a profile.
    voice_actors: [...va.values()].sort((a, b) => (a.language === b.language ? 0 : a.language === "Japanese" ? -1 : 1)).slice(0, 6),
    collections,
    popular_rank: popularRank,
    trending_rank: trendingRank,
    source_url: c.siteUrl ?? null,
  };
}

/* ---------------- 3. save ---------------- */
async function save(rows) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const r of rows) {
      await client.query(
        `insert into anime_characters (id, slug, name, name_native, aliases, image_url, gender, age, birthday, blood_type,
                                       favourites, about, anime, voice_actors, collections, popular_rank, trending_rank,
                                       source_url, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,now())
         on conflict (id) do update set
           slug = excluded.slug, name = excluded.name, name_native = excluded.name_native, aliases = excluded.aliases,
           image_url = excluded.image_url, gender = excluded.gender, age = excluded.age, birthday = excluded.birthday,
           blood_type = excluded.blood_type, favourites = excluded.favourites, about = excluded.about,
           anime = excluded.anime, voice_actors = excluded.voice_actors, collections = excluded.collections,
           popular_rank = excluded.popular_rank, trending_rank = excluded.trending_rank,
           source_url = excluded.source_url, updated_at = now()`,
        // overview and noindex are editor/AI-owned and deliberately not touched by a re-sync.
        [
          r.id, r.slug, r.name, r.name_native, r.aliases, r.image_url, r.gender, r.age, r.birthday, r.blood_type,
          r.favourites, r.about, JSON.stringify(r.anime), JSON.stringify(r.voice_actors), r.collections,
          r.popular_rank, r.trending_rank, r.source_url,
        ],
      );
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

/* ---------------- 4. AI overview (facts only) ---------------- */
async function writeOverviews() {
  const { generateWithAI } = await import("./lib/ai.mjs");
  const pool = getPool();
  const { rows } = await pool.query(
    `select id, name, name_native, gender, age, birthday, blood_type, favourites, about, anime, voice_actors
       from anime_characters where overview is null order by coalesce(popular_rank, 999), coalesce(trending_rank, 999)`,
  );
  console.log(`Writing overviews for ${rows.length} characters…`);
  let done = 0;
  for (const r of rows) {
    const va = r.voice_actors ?? [];
    const facts = {
      name: r.name,
      nativeName: r.name_native,
      gender: r.gender,
      age: r.age,
      birthday: r.birthday ? `month/day ${r.birthday}` : null,
      bloodType: r.blood_type,
      fanFavourites: r.favourites,
      // Distinct titles only: the same series often has many season/movie entries.
      mainSeries: (r.anime ?? [])[0]?.title ?? null,
      otherTitles: [...new Set((r.anime ?? []).slice(1).map((a) => a.title))].slice(0, 3),
      roleInMainSeries: (r.anime ?? [])[0]?.role ?? null,
      japaneseVoiceActors: va.filter((v) => v.language === "Japanese").map((v) => v.name),
      englishVoiceActors: va.filter((v) => v.language === "English").map((v) => v.name),
      officialDescription: r.about,
    };
    const prompt =
      `Write a spoiler-free profile overview of the anime character below, 130-190 words, in 2 short paragraphs of plain English.\n` +
      `Rules: use ONLY the facts given; never invent plot events, relationships, abilities or quotes; do not reveal twists or deaths; ` +
      `name the main series once (do not list every season or movie); state the Japanese and English voice actors separately and never ` +
      `attribute a voice actor to the wrong language; skip any fact that is null or empty; do not start with "X is a male/female anime character"; ` +
      `no headings, no bullet points, no markdown.\n\n` +
      JSON.stringify(facts, null, 2);
    try {
      const text = (await generateWithAI(prompt, { temperature: 0.4, maxTokens: 700 }))?.trim();
      if (text && text.length > 200) {
        await pool.query(`update anime_characters set overview = $2, updated_at = now() where id = $1`, [r.id, text]);
        done++;
        console.log(`  [${done}/${rows.length}] ${r.name}`);
      } else {
        console.warn(`  skip ${r.name}: empty/short response`);
      }
    } catch (err) {
      console.warn(`  skip ${r.name}: ${String(err.message).split("\n")[0]}`);
    }
    await sleep(Number(process.env.AI_DELAY_MS) || 1500);
  }
  return done;
}

/* ---------------- main ---------------- */
if (!AI_ONLY) {
  console.log(`Collecting ids (popular ${POPULAR}, trending ${TRENDING_MAX} from ${TRENDING_ANIME} anime, leads)…`);
  const { popular, trending, leads } = await collectIds();
  const all = [...new Set([...popular, ...trending, ...leads])];
  console.log(`  ${popular.length} popular, ${trending.length} trending, ${leads.length} leads -> ${all.length} unique characters`);

  const rows = [];
  for (const id of all) {
    const c = (await gql(DETAIL_Q, { id }))?.Character;
    if (!c) {
      console.warn(`  skip id ${id}: no data`);
      continue;
    }
    const collections = [];
    if (popular.includes(id)) collections.push("popular");
    if (trending.includes(id)) collections.push("trending");
    if (leads.includes(id)) collections.push("lead");
    const pr = popular.indexOf(id);
    const tr = trending.indexOf(id);
    rows.push(toRow(c, { popularRank: pr >= 0 ? pr + 1 : null, trendingRank: tr >= 0 ? tr + 1 : null, collections }));
    process.stdout.write(`\r  fetched ${rows.length}/${all.length}`);
  }
  process.stdout.write("\n");

  if (!rows.length) {
    console.error("Nothing fetched (AniList unreachable?). Aborting.");
    process.exit(1);
  }
  if (DRY) {
    console.log(JSON.stringify(rows.slice(0, 2), null, 2));
    console.log(`Dry run: ${rows.length} characters fetched, nothing saved.`);
  } else {
    await save(rows);
    await recordSync("anilist-characters", { pages: all.length, rows: rows.length, full: true });
    console.log(`Saved ${rows.length} characters to anime_characters.`);
  }
}

if (AI && !DRY) {
  const n = await writeOverviews();
  console.log(`Wrote ${n} overviews.`);
}

if (!DRY) await getPool().end();
