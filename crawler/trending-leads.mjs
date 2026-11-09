/*
Builds lib/data/trending-leads.json: the main FEMALE lead of each of the top 50
currently-airing ("trending") anime, via Jikan (MyAnimeList).

  npm run generate:leads

Per anime: take Main-role characters (most-favorited first), look each up, and
pick the first one detected as female. Anime with no detectable female lead are
skipped and the next trending anime fills the slot, until we have 50.
Jikan allows ~3 req/s and 60/min, so this is throttled and takes a few minutes.
*/
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const JIKAN = "https://api.jikan.moe/v4";
const TARGET = 50;
const MAX_TOP_PAGES = 6;
const MAX_CANDIDATES = 4;
const GAP_MS = 1100; // ~55 req/min, under Jikan's 60/min cap

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;

async function jikan(p, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const wait = last + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    try {
      const res = await fetch(`${JIKAN}${p}`);
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
      if (res.status !== 429 && res.status < 500) return null;
    } catch {
      /* network blip: retry */
    }
    await sleep(2000 * (i + 1));
  }
  return null;
}

/** "female" | "male" | null, from the character's MAL profile text. */
function detectGender(about) {
  if (!about) return null;
  const tag = /\b(?:gender|sex)\s*:\s*(female|male)\b/i.exec(about);
  if (tag) return tag[1].toLowerCase();
  const she = (about.match(/\b(she|her|hers|herself)\b/gi) ?? []).length;
  const he = (about.match(/\b(he|him|his|himself)\b/gi) ?? []).length;
  if (she >= 2 && she > he * 1.5) return "female";
  if (he >= 2 && he > she * 1.5) return "male";
  return null;
}

const img = (o) => o?.images?.webp?.large_image_url ?? o?.images?.webp?.image_url ?? o?.images?.jpg?.image_url ?? null;

async function findFemaleLead(animeId) {
  const json = await jikan(`/anime/${animeId}/characters`);
  const mains = (json?.data ?? [])
    .filter((c) => c.role === "Main")
    .sort((a, b) => (b.favorites ?? 0) - (a.favorites ?? 0))
    .slice(0, MAX_CANDIDATES);
  for (const m of mains) {
    const full = await jikan(`/characters/${m.character.mal_id}`);
    const c = full?.data;
    if (!c || detectGender(c.about) !== "female") continue;
    return {
      id: c.mal_id,
      name: c.name,
      nameKanji: c.name_kanji ?? null,
      image: img(c),
      favorites: c.favorites ?? 0,
    };
  }
  return null;
}

const items = [];
const seen = new Set();

for (let page = 1; page <= MAX_TOP_PAGES && items.length < TARGET; page++) {
  const top = await jikan(`/top/anime?filter=airing&sfw=true&limit=25&page=${page}`);
  const rows = top?.data ?? [];
  if (!rows.length) break;
  for (const a of rows) {
    if (items.length >= TARGET) break;
    if (seen.has(a.mal_id)) continue;
    seen.add(a.mal_id);
    const character = await findFemaleLead(a.mal_id);
    const tag = `[${items.length + 1}/${TARGET}]`;
    if (!character) {
      console.log(`${tag} skip  ${a.title} (no female lead found)`);
      continue;
    }
    console.log(`${tag} ok    ${a.title} -> ${character.name}`);
    items.push({
      rank: items.length + 1,
      anime: {
        malId: a.mal_id,
        title: a.title_english || a.title,
        titleOriginal: a.title,
        image: img(a),
        score: a.score ?? null,
        year: a.year ?? null,
        episodes: a.episodes ?? null,
        genres: (a.genres ?? []).map((g) => g.name),
        synopsis: typeof a.synopsis === "string" ? a.synopsis.replace(/\s*\[Written by MAL Rewrite\]\s*$/, "").trim() : null,
      },
      character,
    });
  }
}

if (items.length === 0) {
  console.error("No leads fetched (Jikan unreachable?). Leaving existing file untouched.");
  process.exit(1);
}

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib", "data", "trending-leads.json");
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, JSON.stringify({ generatedAt: new Date().toISOString(), items }, null, 2) + "\n");
console.log(`Wrote ${items.length} leads to ${path.relative(process.cwd(), out)}`);
