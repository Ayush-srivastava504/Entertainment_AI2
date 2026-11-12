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

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params })}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Wikipedia responded ${res.status}`);
  return res.json();
}

// Sections that narrate the whole story, ending included. "Premise" and
// "Summary" usually describe only the setup, so a guide grounded on them has
// to invent its ending.
const FULL_PLOT_HEADINGS = new Set(["plot", "synopsis", "story", "plot summary"]);

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

export async function fetchPlot({ title, year, kind }) {
  const noun = kind === "anime" ? "anime" : "film";
  const queries = [`${title} ${year ?? ""} ${noun}`.replace(/\s+/g, " ").trim(), `${title} ${noun}`];

  for (const q of queries) {
    const search = await api({ action: "query", list: "search", srsearch: q, srlimit: "3" });
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
