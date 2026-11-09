/*
Syncs anime character profiles from AniList into the `anime_characters` table
in Supabase, for the /characters pages.

  npm run crawl:characters                 # fetch + save (needs DATABASE_URL)
  npm run crawl:characters -- --ai         # also write a spoiler-free overview per character (needs GEMINI_API_KEY)
  npm run crawl:characters -- --ai-only    # only (re)write missing overviews for rows already saved
  npm run crawl:characters -- --dry-run    # fetch and print, save nothing
  npm run crawl:characters -- --reslug-only  # only recompute URL slugs for rows already saved
  npm run crawl:characters -- --reslug-only --dry-run  # print the slug changes, write nothing
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
const RESLUG_ONLY = !!args["reslug-only"];

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

/* ---------------- URL slugs ----------------
Profiles live at /characters/<slug>. The slug is the character's name, the
way people search for it ("mikasa-ackerman"), with no id in it. When two
characters share a name, the more-favourited one keeps the plain name and the
other gets its main anime appended ("rin-tohsaka-fate-stay-night"); the id is
only a last resort. Old "<id>-<name>" URLs 301 to the new slug (see
app/characters/[slug]/page.tsx).

Slugs are stable: a row keeps its current slug as long as it is still one of
its own valid candidates, so a re-sync never shuffles live URLs around. */
function slugPart(s, maxWords = 0) {
  let out = String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // strip accents: "Émilia" -> "emilia"
    .replace(/['’]/g, "") // "journey's" -> "journeys"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (maxWords) out = out.split("-").filter(Boolean).slice(0, maxWords).join("-");
  return out;
}

/** The character's home series: a MAIN role first, then the earliest entry (season 1, not season 3). */
function mainAnime(anime) {
  const list = Array.isArray(anime) ? anime : [];
  const year = (a) => a.year ?? 9999;
  const pool = list.filter((a) => a.role === "MAIN");
  return [...(pool.length ? pool : list)].sort((a, b) => year(a) - year(b))[0] ?? null;
}

/** "Attack on Titan Season 3" -> "Attack on Titan", "Re:ZERO -Starting Life…-" -> "Re:ZERO", "HUNTER×HUNTER (2011)" -> "HUNTER×HUNTER". */
function shortTitle(title) {
  return String(title ?? "")
    .replace(/\(.*?\)/g, " ")
    .split(/\s+[-–—]\s*|:\s+/)[0]
    .replace(/\b(season|part|cour)\s*\d+\b/gi, " ")
    .replace(/\b\d+(st|nd|rd|th)\s+season\b/gi, " ")
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/\s+(ii|iii|iv|\d)\s*$/i, " ")
    .trim();
}

/** Show part of the slug, without repeating the character's own name ("frieren" + "Frieren: Beyond Journey's End"). */
function showSlug(name, anime) {
  const a = mainAnime(anime);
  if (!a) return "";
  const nameWords = new Set(slugPart(name).split("-"));
  const strip = (s) => s.split("-").filter((w) => w && !nameWords.has(w)).join("-");
  let show = strip(slugPart(shortTitle(a.title), 5));
  if (!show) show = strip(slugPart(a.title.replace(/\(.*?\)/g, " "), 6)).split("-").slice(0, 5).join("-");
  return show;
}

/*
AniList romanises Japanese long vowels ("Tanjirou", "Gojou", "Shouyou",
"Senkuu"), but people search the short form ("tanjiro", "gojo", "shoyo",
"senku"). Shorten them, but only for names written with kanji/hiragana: an
all-katakana native name is a foreign name ("Louise"), left as is.
*/
function searchName(name, native) {
  const s = slugPart(name);
  const japanese = /[\p{Script=Hiragana}\p{Script=Han}]/u.test(native ?? "");
  if (!japanese) return s;
  return s
    .split("-")
    .map((w) => w.replace(/ou/g, "o").replace(/uu/g, "u"))
    .join("-");
}

function slugCandidates({ id, name, name_native, anime }) {
  const base = searchName(name, name_native);
  const show = showSlug(name, anime);
  if (!base) return show ? [`${show}-character-${id}`] : [`character-${id}`];
  // A purely numeric name ("02") would look like a legacy "<id>" URL.
  const safeBase = /^\d+$/.test(base) ? `${base}-character` : base;
  const withShow = show ? `${safeBase}-${show}` : null;
  // One-word names ("power", "levi", "karen") are ambiguous on their own and
  // people search them with the show ("power chainsaw man"), so lead with that.
  const out = !safeBase.includes("-") && withShow ? [withShow, safeBase] : [safeBase, ...(withShow ? [withShow] : [])];
  out.push(`${safeBase}-${id}`);
  return out;
}

/** rows: [{id, name, anime, favourites, slug}] -> Map(id -> slug), most-favourited first wins a clash. */
function assignSlugs(rows) {
  const sorted = [...rows].sort((a, b) => (b.favourites ?? 0) - (a.favourites ?? 0) || a.id - b.id);
  const taken = new Map();
  const result = new Map();
  // Pass 1: keep every current slug that is still valid for its row.
  for (const r of sorted) {
    if (r.slug && slugCandidates(r).includes(r.slug) && !taken.has(r.slug)) {
      taken.set(r.slug, r.id);
      result.set(r.id, r.slug);
    }
  }
  // Pass 2: everyone else takes their first free candidate.
  for (const r of sorted) {
    if (result.has(r.id)) continue;
    const slug = slugCandidates(r).find((s) => !taken.has(s)) ?? `character-${r.id}`;
    taken.set(slug, r.id);
    result.set(r.id, slug);
  }
  return result;
}

/** Recompute slugs for the whole table. Two-step update so the unique index never trips mid-swap. */
async function reslug(client, { dryRun = false } = {}) {
  const { rows } = await client.query(`select id, name, name_native, anime, favourites, slug from anime_characters`);
  const next = assignSlugs(rows.map((r) => ({ ...r, id: Number(r.id) })));
  const changes = rows.filter((r) => next.get(Number(r.id)) !== r.slug).map((r) => ({ id: Number(r.id), from: r.slug, to: next.get(Number(r.id)) }));
  if (dryRun) {
    for (const c of changes) console.log(`  ${c.from}  ->  ${c.to}`);
    return changes.length;
  }
  for (const c of changes) await client.query(`update anime_characters set slug = $2 where id = $1`, [c.id, `__tmp-${c.id}`]);
  for (const c of changes) await client.query(`update anime_characters set slug = $2 where id = $1`, [c.id, c.to]);
  return changes.length;
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
    slug: `__new-${c.id}`, // placeholder; real slug is assigned by reslug() after the save
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
           name = excluded.name, name_native = excluded.name_native, aliases = excluded.aliases,
           image_url = excluded.image_url, gender = excluded.gender, age = excluded.age, birthday = excluded.birthday,
           blood_type = excluded.blood_type, favourites = excluded.favourites, about = excluded.about,
           anime = excluded.anime, voice_actors = excluded.voice_actors, collections = excluded.collections,
           popular_rank = excluded.popular_rank, trending_rank = excluded.trending_rank,
           source_url = excluded.source_url, updated_at = now()`,
        // overview and noindex are editor/AI-owned and deliberately not touched by a re-sync;
        // slug is owned by reslug() below so live URLs stay stable.
        [
          r.id, r.slug, r.name, r.name_native, r.aliases, r.image_url, r.gender, r.age, r.birthday, r.blood_type,
          r.favourites, r.about, JSON.stringify(r.anime), JSON.stringify(r.voice_actors), r.collections,
          r.popular_rank, r.trending_rank, r.source_url,
        ],
      );
    }
    const changed = await reslug(client);
    console.log(`  ${changed} slug(s) assigned or updated.`);
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
if (RESLUG_ONLY) {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const n = await reslug(client, { dryRun: DRY });
    await client.query(DRY ? "rollback" : "commit");
    console.log(DRY ? `Dry run: ${n} slug change(s) listed above, nothing written.` : `Updated ${n} slug(s).`);
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
    await getPool().end();
  }
  process.exit(0);
}

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
