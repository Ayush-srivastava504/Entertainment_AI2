/*
Fetches a plot summary from Wikipedia to ground the LLM. Accurate endings
are the hardest part of this site's content: without real plot facts a model
will invent one. Wikipedia's plot sections are detailed and current, so they
are used as *source facts only* (the generator instructs the model to
rewrite in its own words and never copy phrasing). Plot text is never
published verbatim.

Returns null whenever a confident match cannot be made; the generator then
falls back to catalog synopsis alone and skips titles with too little
grounding rather than guessing.
*/

const API = "https://en.wikipedia.org/w/api.php";
const USER_AGENT = "Animegirl4uGuideBot/1.0 (https://animegirl4u.com; content grounding)";

const normalize = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Wikipedia search treats "-word" as "exclude word" and quotes as phrases, so
// catalog titles like "Demon Slayer -Kimetsu no Yaiba-" must be flattened.
const searchText = (s) => String(s).replace(/["–—:!?]+|(^|\s)-|-(\s|$)/g, " ").replace(/\s+/g, " ").trim();

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params })}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Wikipedia responded ${res.status}`);
  return res.json();
}

// Sections that narrate the whole story, ending included. "Premise" and
// "Summary" usually describe only the setup, so a guide grounded on them has
// to invent its ending.
// "Episodes" is the joined per-episode summaries of a season or episode-list
// article (fetchEpisodeSummaries): every episode, the final one included.
const FULL_PLOT_HEADINGS = new Set(["plot", "synopsis", "story", "plot summary", "episodes"]);

/**
 * Minimum plot text needed to write the "ending" section from facts instead
 * of guesses. Below this the guide is skipped (generator) or flagged weak
 * (crawler/guide-grounding-audit.mjs).
 */
export const MIN_FULL_PLOT_CHARS = 1500;

/** True when a fetched plot ({ heading, text }) can support a real ending breakdown. */
export function coversEnding(plot) {
  return Boolean(
    plot && FULL_PLOT_HEADINGS.has(String(plot.heading ?? "").toLowerCase()) && (plot.text ?? "").length >= MIN_FULL_PLOT_CHARS
  );
}

/** Pulls the "Plot" (or similar) section out of a plain-text article. */
export function extractPlotSection(fullText) {
  return extractPlotSectionWithHeading(fullText).text;
}

/** Same as extractPlotSection, plus the heading it came from. */
export function extractPlotSectionWithHeading(fullText) {
  if (!fullText) return { heading: "", text: "" };
  const headingRe = /^==\s*(Plot|Synopsis|Premise|Story|Summary|Plot summary)\s*==\s*$/im;
  const m = headingRe.exec(fullText);
  if (!m) return { heading: "", text: "" };
  const rest = fullText.slice(m.index + m[0].length);
  // Stop at the next top-level (==) heading; keep === subsections as part of the plot.
  const next = /^==\s*[^=].*?==\s*$/m.exec(rest);
  const section = (next ? rest.slice(0, next.index) : rest)
    .replace(/^=+\s*.*?\s*=+\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { heading: m[1], text: section };
}

/** Confident-match check: title words must all appear in the page title. */
export function titleMatches(pageTitle, wantedTitle) {
  const p = normalize(pageTitle);
  const w = normalize(wantedTitle);
  return w.length > 0 && p.includes(w);
}

async function fetchPlotSection({ title, year, kind }) {
  const noun = kind === "anime" ? "anime" : "film";
  const queries = [`${title} ${year ?? ""} ${noun}`.replace(/\s+/g, " ").trim(), `${title} ${noun}`];

  for (const q of queries) {
    const search = await api({ action: "query", list: "search", srsearch: searchText(q), srlimit: "3" });
    const hits = search?.query?.search ?? [];
    for (const hit of hits) {
      if (!titleMatches(hit.title, title)) continue;

      const page = await api({
        action: "query",
        prop: "extracts",
        explaintext: "1",
        exsectionformat: "wiki",
        pageids: String(hit.pageid),
      });
      const text = page?.query?.pages?.[0]?.extract ?? "";
      const { heading, text: plot } = extractPlotSectionWithHeading(text);
      // Sanity: it should look like the right kind of work, and be substantial.
      const lower = text.slice(0, 1500).toLowerCase();
      const kindOk = kind === "anime" ? /anime|manga|animation|series/.test(lower) : /film|movie/.test(lower);
      if (plot.length >= 400 && kindOk) {
        return {
          text: plot.slice(0, 7000),
          heading,
          url: `https://en.wikipedia.org/?curid=${hit.pageid}`,
          pageTitle: hit.title,
        };
      }
    }
  }
  return null;
}

const ROMAN = { II: 2, III: 3, IV: 4, V: 5, VI: 6 };

/**
 * Splits a catalog season title into its series and season number:
 * "Attack on Titan Season 2", "JUJUTSU KAISEN 2nd Season", "Mob Psycho 100 II",
 * "Avatar: The Last Airbender Book 3: Fire". Returns null for anything else.
 * "Part N" titles return null: a season article covers every part, so its
 * last episode is not that part's ending.
 */
export function parseSeasonTitle(title) {
  const t = String(title ?? "").trim();
  if (/part\s*\d/i.test(t)) return null;
  let m = t.match(/^(.+?)[\s:,-]+season\s+(\d+)\s*$/i) || t.match(/^(.+?)[\s:,-]+(\d+)(?:st|nd|rd|th)\s+season\s*$/i);
  if (m) return { base: m[1].trim(), season: Number(m[2]) };
  m = t.match(/^(.+?)\s+book\s+(\d+)(?::.*)?$/i);
  if (m) return { base: m[1].trim(), season: Number(m[2]) };
  m = t.match(/^(.+?)\s+(II|III|IV|V|VI)\s*$/);
  if (m) return { base: m[1].trim(), season: ROMAN[m[2]] };
  return null;
}

/** Strips wiki markup from an episode summary. */
function cleanWikitext(s) {
  let out = s
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "");
  for (let i = 0; i < 5; i++) out = out.replace(/\{\{[^{}]*\}\}/g, "");
  return out
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/\[https?:\/\/\S+\s([^\]]*)\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Episode summaries ({{Episode list|ShortSummary=...}}) from one article's wikitext. */
export function extractEpisodeSummaries(wikitext) {
  const out = [];
  for (const m of String(wikitext ?? "").matchAll(/\|\s*ShortSummary\s*=([\s\S]*?)(?=\n\s*\||\n?\}\})/g)) {
    const text = cleanWikitext(m[1]);
    if (text.length >= 40) out.push(text);
  }
  return out;
}

/**
 * Joins episode summaries into one plot text. Long runs keep the opening and
 * the final episodes (the ending is what the guide explains), marking the cut.
 */
function joinEpisodes(summaries, cap = 7000) {
  const lines = summaries.map((s, i) => `Episode ${i + 1}: ${s}`);
  const all = lines.join("\n\n");
  if (all.length <= cap) return all;
  const head = [];
  let n = 0;
  for (const l of lines) {
    if (n + l.length > 1500) break;
    head.push(l);
    n += l.length;
  }
  const tail = [];
  n = 0;
  for (const l of [...lines].reverse()) {
    if (n + l.length > cap - 1600) break;
    tail.unshift(l);
    n += l.length;
  }
  return [...head, "[Middle episodes omitted]", ...tail].join("\n\n");
}

async function episodesFromPage(pageTitle) {
  const res = await api({ action: "parse", page: pageTitle, prop: "wikitext", redirects: "1" }).catch(() => null);
  const wikitext = res?.parse?.wikitext;
  if (!wikitext) return null;
  const summaries = extractEpisodeSummaries(wikitext);
  const text = joinEpisodes(summaries);
  if (summaries.length < 3 || text.length < MIN_FULL_PLOT_CHARS) return null;
  return {
    text,
    heading: "Episodes",
    url: `https://en.wikipedia.org/?curid=${res.parse.pageid}`,
    pageTitle: res.parse.title,
    episodes: summaries.length,
  };
}

/**
 * Season and episode-list articles, for titles whose main article has no
 * full plot: "Attack on Titan Season 2" -> "Attack on Titan season 2". Only
 * pages whose title names the same series (and season) are accepted.
 */
export async function fetchEpisodeSummaries(title) {
  const season = parseSeasonTitle(title);
  const base = normalize(season ? season.base : title.replace(/\s*\([^)]*\)\s*$/, ""));
  if (!base) return null;
  const query = season ? `${season.base} season ${season.season}` : `List of ${title} episodes`;
  const accept = (pageTitle) => {
    const p = normalize(pageTitle);
    if (!p.includes(base)) return false;
    return season ? new RegExp(`\\bseason ${season.season}\\b`).test(p) : /^list of .* episodes$/.test(p);
  };

  const search = await api({ action: "query", list: "search", srsearch: searchText(query), srlimit: "5" });
  for (const hit of search?.query?.search ?? []) {
    if (!accept(hit.title)) continue;
    const found = await episodesFromPage(hit.title);
    if (found) return found;
  }
  return null;
}

export async function fetchPlot({ title, year, kind }) {
  if (kind === "anime" && parseSeasonTitle(title)) {
    const episodes = await fetchEpisodeSummaries(title);
    if (episodes) return episodes;
  }
  const main = await fetchPlotSection({ title, year, kind });
  if (kind === "anime" && !coversEnding(main)) {
    const episodes = await fetchEpisodeSummaries(title).catch(() => null);
    if (episodes) return episodes;
  }
  return main;
}
