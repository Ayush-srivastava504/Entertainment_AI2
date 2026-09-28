/*
Watch Order pipeline: fully automatic, same standards as the Ending Explained
generator (ground -> draft -> validate -> verify -> publish).

  1. DISCOVER  Finds franchises by itself, no hand-kept list:
                 movies: TMDB collections (belongs_to_collection)
                 anime:  Jikan relations (sequel/prequel/side story graph)
               Missing entries are added to the catalog so orders are complete.
               Franchises with fewer than MIN_ENTRIES titles are ignored (thin).
  2. DRAFT     Model writes intro, meta description, recommended order,
               per-entry notes and FAQ as JSON, grounded in catalog facts only.
  3. VALIDATE  Deterministic checks (permutation of ids, lengths, banned text).
  4. VERIFY    Second model call fact-checks the draft; one revision allowed.
  5. PUBLISH   needs_review=false only after every step passes. Failures keep
               needs_review=true and retry after a cool-down.

  node crawler/watch-order-auto.mjs [--limit=10] [--discover-movies=150]
       [--discover-anime=40] [--no-discover] [--no-verify] [--dry-run]
*/

import { getPool, recordSync, sleep, upsertAnimeBatch } from "./db.mjs";
import { generateWithGemini, getLastModelUsed } from "./lib/ai.mjs";
import { parseModelJson } from "./lib/quality.mjs";
import { slugifyTitle, buildMediaSlug } from "./lib/slug.mjs";
import { pingIndexNow } from "./lib/indexnow.mjs";

const args = process.argv.slice(2);
const argValue = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const flag = (n) => args.includes(`--${n}`);

const LIMIT = Number(argValue("limit") ?? 10);
const DISCOVER_MOVIES = Number(argValue("discover-movies") ?? 150);
const DISCOVER_ANIME = Number(argValue("discover-anime") ?? 40);
const DISCOVER = !flag("no-discover");
const VERIFY = !flag("no-verify");
const DRY_RUN = flag("dry-run");
const MIN_ENTRIES = Number(process.env.WATCH_ORDER_MIN_ENTRIES ?? 3);
const MAX_ENTRIES = 30;
const RETRY_AFTER_DAYS = 3;
const REQUEST_DELAY_MS = Number(process.env.AI_DELAY_MS ?? 8_000);
const TMDB_TOKEN = process.env.TMDB_API_READ_ACCESS_TOKEN;
const TODAY = new Date().toISOString().slice(0, 10);
const IMG = "https://image.tmdb.org/t/p";

// ---------------------------------------------------------------- helpers
async function getJson(url, headers = {}, label = url) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { headers: { Accept: "application/json", ...headers } });
    if (res.status === 429 || res.status >= 500) {
      await sleep(1500 * attempt);
      continue;
    }
    if (!res.ok) return null;
    return res.json();
  }
  console.warn(`    [fetch] gave up on ${label}`);
  return null;
}
const tmdb = (path) => getJson(`https://api.themoviedb.org/3${path}`, { Authorization: `Bearer ${TMDB_TOKEN}` }, path);
async function jikan(path) {
  await sleep(1100); // Jikan allows ~3 req/s, 60/min
  const json = await getJson(`https://api.jikan.moe/v4${path}`, {}, path);
  return json?.data ?? null;
}

async function ensureSchema(pool) {
  await pool.query(`
    alter table franchises
      add column if not exists source_key text,
      add column if not exists faq jsonb,
      add column if not exists attempted_at timestamptz,
      add column if not exists skip_reason text;
    create unique index if not exists idx_franchises_source_key on franchises (source_key) where source_key is not null;
    alter table movies add column if not exists collection_checked_at timestamptz;
    alter table anime add column if not exists relations_checked_at timestamptz;
  `);
}

async function insertFranchise(pool, { sourceKey, title, mediaType, slugBase, entries }) {
  if (entries.length < MIN_ENTRIES) return false;
  const entriesCapped = entries.slice(0, MAX_ENTRIES);
  let slug = slugBase;
  const clash = await pool.query("select source_key from franchises where slug = $1", [slug]);
  if (clash.rows[0] && clash.rows[0].source_key !== sourceKey) slug = `${slugBase}-${sourceKey.split(":")[1]}`;
  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query(
      `insert into franchises (slug, title, media_type, source_key)
       values ($1,$2,$3,$4)
       on conflict (source_key) where source_key is not null do nothing
       returning id`,
      [slug, title, mediaType, sourceKey]
    );
    if (!rows[0]) { await client.query("rollback"); return false; }
    for (const [i, e] of entriesCapped.entries()) {
      await client.query(
        `insert into franchise_entries (franchise_id, title_id, media_type, order_index, order_type)
         values ($1,$2,$3,$4,'release')`,
        [rows[0].id, e.id, e.mediaType, i + 1]
      );
    }
    await client.query("commit");
    console.log(`[watch-order] discovered "${title}" (${entriesCapped.length} entries).`);
    return true;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

// -------------------------------------------------------- discover: movies
async function discoverMovies(pool) {
  if (!TMDB_TOKEN) { console.warn("[watch-order] TMDB token missing; skipping movie discovery."); return 0; }
  const { rows } = await pool.query(
    `select id, tmdb_id from movies
     where tmdb_id is not null and collection_checked_at is null
     order by coalesce(watchers, plays, list_count, 0) desc
     limit $1`, [DISCOVER_MOVIES]);
  const genreData = await tmdb("/genre/movie/list?language=en-US");
  const genreMap = new Map((genreData?.genres ?? []).map((g) => [g.id, g.name]));
  const seen = new Set();
  let created = 0;

  for (const row of rows) {
    const detail = await tmdb(`/movie/${row.tmdb_id}`);
    if (!detail) continue; // transient: leave unchecked, retry next run
    await pool.query("update movies set collection_checked_at = now() where id = $1", [row.id]);
    const col = detail.belongs_to_collection;
    if (!col || seen.has(col.id)) continue;
    seen.add(col.id);
    const sourceKey = `tmdb-collection:${col.id}`;
    if ((await pool.query("select 1 from franchises where source_key = $1", [sourceKey])).rowCount) continue;

    const data = await tmdb(`/collection/${col.id}`);
    const parts = (data?.parts ?? [])
      .filter((p) => p.release_date && p.release_date <= TODAY)
      .sort((a, b) => a.release_date.localeCompare(b.release_date));
    if (parts.length < MIN_ENTRIES) continue;

    for (const p of parts) {
      const year = Number(p.release_date.slice(0, 4));
      await pool.query(
        `insert into movies (id, tmdb_id, slug, title, description, poster_url, background_url, year, score,
                             vote_count, genres, language, released_at, raw)
         values ($1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         on conflict (id) do nothing`,
        [String(p.id), buildMediaSlug(p.title, year, p.id), p.title, p.overview ?? null,
         p.poster_path ? `${IMG}/w500${p.poster_path}` : null,
         p.backdrop_path ? `${IMG}/original${p.backdrop_path}` : null,
         year, p.vote_average ?? null, p.vote_count ?? null,
         (p.genre_ids ?? []).map((g) => genreMap.get(g)).filter(Boolean),
         p.original_language ?? null, p.release_date, JSON.stringify(p)]
      );
    }
    const title = (data.name || col.name).replace(/\s+Collection$/i, "").trim();
    const ok = await insertFranchise(pool, {
      sourceKey, title, mediaType: "movie", slugBase: slugifyTitle(title),
      entries: parts.map((p) => ({ id: String(p.id), mediaType: "movie" })),
    });
    if (ok) created++;
  }
  return created;
}

// --------------------------------------------------------- discover: anime
const LINK_TYPES = new Set(["Sequel", "Prequel", "Parent story", "Side story", "Spin-off", "Full story"]);
const KEEP_TYPES = new Set(["TV", "Movie", "OVA", "ONA"]);

function animeRow(item, rank) {
  return {
    id: String(item.mal_id), title: item.title ?? "Untitled anime", title_english: item.title_english ?? null,
    synopsis: item.synopsis ?? null,
    poster_url: item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url ?? null,
    trailer_url: item.trailer?.url ?? null, year: item.year ?? item.aired?.prop?.from?.year ?? null,
    score: item.score ?? null, scored_by: item.scored_by ?? null, popularity: item.popularity ?? rank,
    rank: item.rank ?? null, episodes: item.episodes ?? null, status: item.status ?? null, type: item.type ?? null,
    genres: (item.genres ?? []).map((g) => g.name).filter(Boolean),
    studios: (item.studios ?? []).map((s) => s.name).filter(Boolean),
    aired_from: item.aired?.from ? item.aired.from.slice(0, 10) : null,
    aired_to: item.aired?.to ? item.aired.to.slice(0, 10) : null,
    raw: item, source: "jikan",
  };
}

async function discoverAnime(pool) {
  const { rows } = await pool.query(
    `select id from anime
     where source = 'jikan' and relations_checked_at is null
       and id not in (select title_id from franchise_entries where media_type = 'anime')
     order by popularity asc nulls last limit $1`, [DISCOVER_ANIME]);
  let created = 0;

  for (const start of rows) {
    // Breadth-first walk over sequel/prequel/side-story links, capped for politeness.
    const nodes = new Map(); // mal id -> anime detail
    const queue = [start.id];
    let calls = 0;
    while (queue.length && calls < 25 && nodes.size < MAX_ENTRIES) {
      const id = queue.shift();
      if (nodes.has(id)) continue;
      const detail = await jikan(`/anime/${id}`);
      const rel = await jikan(`/anime/${id}/relations`);
      calls++;
      if (!detail) continue;
      nodes.set(id, detail);
      for (const r of rel ?? []) {
        if (!LINK_TYPES.has(r.relation)) continue;
        for (const e of r.entry ?? []) if (e.type === "anime" && !nodes.has(String(e.mal_id))) queue.push(String(e.mal_id));
      }
    }
    const ids = [...nodes.keys()];
    if (ids.length) await pool.query("update anime set relations_checked_at = now() where id = any($1)", [ids]);

    const kept = [...nodes.values()]
      .filter((d) => KEEP_TYPES.has(d.type) && d.aired?.from)
      .sort((a, b) => a.aired.from.localeCompare(b.aired.from));
    if (kept.length < MIN_ENTRIES) continue;
    await upsertAnimeBatch(kept.map((d, i) => animeRow(d, i + 1)));

    const root = kept[0];
    const title = (root.title_english || root.title).trim();
    const ok = await insertFranchise(pool, {
      sourceKey: `jikan-franchise:${root.mal_id}`, title, mediaType: "anime", slugBase: slugifyTitle(title),
      entries: kept.map((d) => ({ id: String(d.mal_id), mediaType: "anime" })),
    });
    if (ok) created++;
  }
  return created;
}

// ------------------------------------------------------------ draft/verify
const SYSTEM = [
  "You are a careful franchise-continuity editor writing a Watch Order guide for a public website.",
  "Use ONLY the entry facts supplied. Do not invent plot points, release dates, character names or continuity claims.",
  "No spoilers beyond each entry's basic premise. Plain, specific, human prose. No hype, no filler, no first person.",
  "Return a single JSON object and nothing else.",
].join(" ");

const BANNED = /\b(as an ai|i cannot|in conclusion|whether you're a|dive into|delve|tapestry|rollercoaster|buckle up)\b/i;
const words = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean).length;

function entryLine(e) {
  const bits = [e.kind === "anime" ? (e.type ?? "anime") : "movie", e.year, e.episodes ? `${e.episodes} eps` : null, e.score ? `score ${Number(e.score).toFixed(1)}` : null]
    .filter(Boolean).join(", ");
  return `[${e.id}] ${e.title} (${bits}) — ${(e.synopsis ?? "").replace(/\s+/g, " ").slice(0, 280)}`;
}

function draftPrompt(f, issues) {
  return [
    `Franchise: ${f.title} (${f.mediaType}).`,
    "Entries in RELEASE order (bracketed value is the id):",
    ...f.entries.map(entryLine),
    "",
    "Return JSON with exactly these keys:",
    '"metaDescription": 110-155 characters, mentions the franchise name and that it is a watch order guide.',
    '"intro": 80-140 words: what the franchise is, how the entries connect, and honestly whether order matters.',
    '"recommendedOrder": array containing EVERY id above exactly once, in the order a first-time viewer should watch.',
    '"notes": array of {"id","note"} for every id; each note 15-45 words on why it sits there and what it adds.',
    '"faq": array of 3 {"q","a"}: where to start, whether release order is required, and which entries can be skipped (say none if none). Answers 30-70 words.',
    ...(issues?.length ? ["", "Fix these problems from your previous draft:", ...issues.map((i) => `- ${i}`)] : []),
  ].join("\n");
}

function validate(d, f) {
  const problems = [];
  if (!d || typeof d !== "object") return ["not an object"];
  const ids = new Set(f.entries.map((e) => e.id));
  const order = Array.isArray(d.recommendedOrder) ? d.recommendedOrder.map(String) : [];
  if (new Set(order).size !== order.length) problems.push("recommendedOrder has duplicates");
  if (order.some((id) => !ids.has(id))) problems.push("recommendedOrder has unknown ids");
  if (order.length < ids.size) problems.push("recommendedOrder is missing entries");
  const iw = words(d.intro);
  if (iw < 60 || iw > 190) problems.push(`intro is ${iw} words (need 80-140)`);
  const md = String(d.metaDescription ?? "");
  if (md.length < 70) problems.push("metaDescription too short");
  const notes = Array.isArray(d.notes) ? d.notes : [];
  const good = notes.filter((n) => ids.has(String(n?.id)) && words(n.note) >= 8 && words(n.note) <= 70);
  if (good.length < Math.ceil(ids.size * 0.8)) problems.push("too few usable per-entry notes");
  const faq = Array.isArray(d.faq) ? d.faq.filter((x) => x?.q && words(x.a) >= 15) : [];
  if (faq.length < 2) problems.push("need at least 2 FAQ items with real answers");
  if (BANNED.test(JSON.stringify(d))) problems.push("contains banned filler phrase");
  return problems;
}

const call = (prompt, opts = {}) =>
  generateWithGemini(prompt, { system: SYSTEM, json: true, maxTokens: 4000, temperature: 0.4, ...opts });

async function produce(f) {
  let issues = [];
  for (let round = 1; round <= 3; round++) {
    const draft = parseModelJson(await call(draftPrompt(f, issues)));
    const problems = validate(draft, f);
    if (problems.length) {
      issues = problems;
      if (round === 3) return { reason: `failed quality gate: ${problems.slice(0, 3).join("; ")}` };
      await sleep(REQUEST_DELAY_MS);
      continue;
    }
    if (!VERIFY) return { draft };
    await sleep(REQUEST_DELAY_MS);
    const verdict = parseModelJson(await call(
      ["Fact-check this Watch Order draft against the entry facts. List every claim (in intro, notes, faq) that states a fact",
       "not supported by the entry facts or that contradicts them. Ignore style. Return JSON {\"unsupported\":[{\"claim\",\"reason\"}]}.",
       "", "Entries:", ...f.entries.map(entryLine), "", "Draft:", JSON.stringify({ intro: draft.intro, notes: draft.notes, faq: draft.faq })].join("\n"),
      { maxTokens: 2000, temperature: 0 }));
    const bad = Array.isArray(verdict.unsupported) ? verdict.unsupported : [];
    if (!bad.length) return { draft, verified: true };
    if (round === 3) return { reason: `fact-check failed: ${bad.slice(0, 2).map((u) => u.claim).join(" | ").slice(0, 300)}` };
    issues = bad.map((u) => `Unsupported claim: "${u.claim}" (${u.reason}). Remove or rewrite using only the supplied facts.`);
    await sleep(REQUEST_DELAY_MS);
  }
  return { reason: "no draft produced" };
}

async function loadFacts(pool, fr) {
  const { rows } = await pool.query(
    `select media_type, title_id from franchise_entries
     where franchise_id = $1 and order_type = 'release' order by order_index`, [fr.id]);
  const entries = [];
  for (const r of rows) {
    const q = r.media_type === "anime"
      ? "select id, coalesce(title_english, title) as title, year, type, episodes, score, coalesce(synopsis_override, synopsis) as synopsis from anime where id = $1"
      : "select id, title, year, null as type, null as episodes, score, coalesce(synopsis_override, description) as synopsis from movies where id = $1";
    const t = (await pool.query(q, [r.title_id])).rows[0];
    if (t) entries.push({ ...t, id: String(t.id), kind: r.media_type });
  }
  return { title: fr.title, mediaType: fr.media_type, entries };
}

async function publish(pool, fr, facts, draft, verified) {
  const noteById = new Map(draft.notes.map((n) => [String(n.id), String(n.note).trim()]));
  const faq = draft.faq.filter((x) => x?.q && x?.a).slice(0, 5).map((x) => ({ q: String(x.q).trim(), a: String(x.a).trim() }));
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("delete from franchise_entries where franchise_id = $1 and order_type = 'recommended'", [fr.id]);
    const byId = new Map(facts.entries.map((e) => [e.id, e]));
    for (const [i, id] of draft.recommendedOrder.map(String).entries()) {
      await client.query(
        `insert into franchise_entries (franchise_id, title_id, media_type, order_index, order_type, note)
         values ($1,$2,$3,$4,'recommended',$5)`,
        [fr.id, id, byId.get(id).kind, i + 1, noteById.get(id) ?? null]);
    }
    await client.query(
      `update franchises set intro = $2, meta_description = $3, faq = $4::jsonb, needs_review = false,
              reviewed_at = now(), published_at = now(), updated_at = now(), attempted_at = now(), skip_reason = null
       where id = $1`,
      [fr.id, String(draft.intro).trim(), String(draft.metaDescription).trim().slice(0, 158), JSON.stringify(faq)]);
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
  console.log(`[watch-order] published ${fr.slug} (${facts.entries.length} entries, verified=${Boolean(verified)}, model=${getLastModelUsed()}).`);
}

async function draftAndPublish(pool) {
  const stats = { queued: 0, published: 0, rejected: 0, failed: 0 };
  const { rows } = await pool.query(
    `select id, slug, title, media_type from franchises
     where needs_review = true and source_key is not null
       and (attempted_at is null or attempted_at < now() - interval '${RETRY_AFTER_DAYS} days')
     order by featured desc, published_at asc limit $1`, [LIMIT]);
  stats.queued = rows.length;
  const urls = [];
  let consecutive = 0;
  for (const fr of rows) {
    try {
      const facts = await loadFacts(pool, fr);
      if (facts.entries.length < MIN_ENTRIES) {
        await pool.query("update franchises set attempted_at = now(), skip_reason = 'too few catalog entries' where id = $1", [fr.id]);
        continue;
      }
      const res = await produce(facts);
      if (!res.draft) {
        stats.rejected++;
        console.warn(`[watch-order] ${fr.slug} rejected: ${res.reason}`);
        if (!DRY_RUN) await pool.query("update franchises set attempted_at = now(), skip_reason = $2 where id = $1", [fr.id, res.reason.slice(0, 500)]);
      } else if (DRY_RUN) {
        console.log(JSON.stringify(res.draft, null, 2));
      } else {
        await publish(pool, fr, facts, res.draft, res.verified);
        stats.published++;
        urls.push(`/watch-order/${fr.slug}`);
      }
      consecutive = 0;
    } catch (err) {
      stats.failed++;
      consecutive++;
      console.warn(`[watch-order] ${fr.slug} failed: ${err.message}`);
      if (consecutive >= 3) { console.warn("[watch-order] repeated API failures; stopping, will retry next run."); break; }
    }
    await sleep(REQUEST_DELAY_MS);
  }
  if (!DRY_RUN) await pingIndexNow(urls);
  return stats;
}

async function main() {
  const pool = getPool();
  try {
    await ensureSchema(pool);
    const discovered = { movies: 0, anime: 0 };
    if (DISCOVER) {
      discovered.movies = await discoverMovies(pool);
      discovered.anime = await discoverAnime(pool);
    }
    const stats = await draftAndPublish(pool);
    if (!DRY_RUN) await recordSync("watch-order-auto", { rows: stats.published, details: { discovered, ...stats } });
    console.log("[watch-order] done:", JSON.stringify({ discovered, ...stats }));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[watch-order] fatal:", err.message);
  process.exitCode = 1;
});
