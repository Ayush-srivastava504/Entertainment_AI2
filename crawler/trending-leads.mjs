/*
Builds lib/data/trending-leads.json: the main FEMALE lead of each of the top 50
trending anime, via the AniList GraphQL API (which exposes character gender).

  npm run generate:leads

Per anime: take MAIN-role characters (most-favourited first) and pick the first
with gender "Female". Anime with no such character are skipped and the next
trending one fills the slot, until we have 50. AniList allows ~90 req/min.
*/
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://graphql.anilist.co";
const TARGET = 50;
const GAP_MS = 800;

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

const TRENDING = `
query ($page: Int) {
  Page(page: $page, perPage: 60) {
    media(type: ANIME, sort: TRENDING_DESC, isAdult: false, format_in: [TV, TV_SHORT, ONA]) { id }
  }
}`;

const DETAIL = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    siteUrl
    title { romaji english }
    coverImage { extraLarge large }
    averageScore
    seasonYear
    episodes
    genres
    description(asHtml: false)
    characters(role: MAIN, sort: FAVOURITES_DESC, perPage: 8) {
      edges {
        node {
          id
          name { full native alternative }
          image { large }
          gender
          age
          favourites
          description(asHtml: false)
          dateOfBirth { month day }
        }
        voiceActors(language: JAPANESE, sort: RELEVANCE) {
          name { full }
          image { medium }
        }
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

const items = [];
const seen = new Set();
const seenChars = new Set();

for (let page = 1; page <= 3 && items.length < TARGET; page++) {
  const list = await gql(TRENDING, { page });
  const ids = (list?.Page?.media ?? []).map((m) => m.id);
  if (!ids.length) break;
  for (const id of ids) {
    if (items.length >= TARGET) break;
    if (seen.has(id)) continue;
    seen.add(id);
    const m = (await gql(DETAIL, { id }))?.Media;
    if (!m) continue;
    const title = m.title.english || m.title.romaji;
    // Several seasons of one franchise are trending at once: show each lead once.
    const edge = (m.characters?.edges ?? []).find((e) => e.node?.gender === "Female" && !seenChars.has(e.node.id));
    if (!edge) {
      console.log(`skip  ${title} (no female main character)`);
      continue;
    }
    const c = edge.node;
    seenChars.add(c.id);
    const dob = c.dateOfBirth?.month && c.dateOfBirth?.day ? c.dateOfBirth : null;
    items.push({
      rank: items.length + 1,
      anime: {
        id: m.id,
        title,
        titleOriginal: m.title.romaji,
        image: m.coverImage?.extraLarge ?? m.coverImage?.large ?? null,
        score: m.averageScore ? m.averageScore / 10 : null,
        year: m.seasonYear ?? null,
        episodes: m.episodes ?? null,
        genres: m.genres ?? [],
        synopsis: clean(m.description, 600),
        url: m.siteUrl,
      },
      character: {
        id: c.id,
        slug: slugify(c.id, c.name.full),
        name: c.name.full,
        nameNative: c.name.native ?? null,
        aliases: (c.name.alternative ?? []).filter(Boolean).slice(0, 6),
        image: c.image?.large ?? null,
        age: c.age ?? null,
        birthday: dob ? `${dob.month}/${dob.day}` : null,
        favourites: c.favourites ?? 0,
        about: clean(c.description, 1500),
        voiceActors: (edge.voiceActors ?? []).slice(0, 3).map((v) => ({ name: v.name.full, image: v.image?.medium ?? null })),
      },
    });
    console.log(`[${items.length}/${TARGET}] ${title} -> ${c.name.full}`);
  }
}

if (items.length === 0) {
  console.error("No leads fetched (AniList unreachable?). Leaving existing file untouched.");
  process.exit(1);
}

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib", "data", "trending-leads.json");
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, JSON.stringify({ generatedAt: new Date().toISOString(), items }, null, 2) + "\n");
console.log(`Wrote ${items.length} leads to ${path.relative(process.cwd(), out)}`);
