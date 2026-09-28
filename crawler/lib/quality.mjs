/*
Quality gate for generated Ending Explained guides. Pure functions, no
network: everything here is unit-tested in crawler/test/quality.test.mjs.
A guide is only published when validateGuide() returns no problems.
*/

export const MIN_TOTAL_WORDS = 700;
export const MIN_ENDING_WORDS = 180;

const BANNED = [
  /\bas an ai\b/i,
  /language model/i,
  /\bi (cannot|can't|don't have access)\b/i,
  /\bin conclusion\b/i,
  /\bdelve\b/i,
  /\btapestry\b/i,
  /\blorem ipsum\b/i,
  /\[[^\]]{1,40}\]/, // leftover [placeholders]
  /\*\*|^#{1,6}\s/m, // markdown the UI would show literally
];

export const words = (text) => (typeof text === "string" ? text.trim().split(/\s+/).filter(Boolean).length : 0);

export function guideWordCount(g) {
  return (
    words(g.recap) +
    words(g.ending) +
    words(g.themes) +
    (g.faq ?? []).reduce((n, f) => n + words(f.q) + words(f.a), 0) +
    (g.keyTakeaways ?? []).reduce((n, t) => n + words(t), 0)
  );
}

/** Parses model output that should be a single JSON object; tolerates code fences. */
export function parseModelJson(text) {
  if (!text) throw new Error("empty model output");
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object in model output");
  return JSON.parse(t.slice(start, end + 1));
}

const str = (v) => (typeof v === "string" ? v.replace(/\r/g, "").trim() : "");

/** Normalizes a raw parsed object into the stored shape. */
export function normalizeGuide(raw) {
  return {
    metaDescription: str(raw.metaDescription),
    keyTakeaways: Array.isArray(raw.keyTakeaways) ? raw.keyTakeaways.map(str).filter(Boolean) : [],
    recap: str(raw.recap),
    ending: str(raw.ending),
    themes: str(raw.themes),
    faq: Array.isArray(raw.faq)
      ? raw.faq.map((f) => ({ q: str(f?.q), a: str(f?.a) })).filter((f) => f.q && f.a)
      : [],
  };
}

function sentenceDuplicates(text) {
  const seen = new Map();
  for (const s of text.split(/(?<=[.!?])\s+/)) {
    const k = s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
    if (k.split(" ").length < 6) continue;
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return [...seen.values()].filter((n) => n > 1).length;
}

/** Returns a list of human-readable problems; empty list means publishable. */
export function validateGuide(g, { title }) {
  const problems = [];
  const total = guideWordCount(g);

  if (!g.recap) problems.push("recap is missing");
  if (!g.ending) problems.push("ending is missing");
  if (!g.themes) problems.push("themes is missing");
  if (total < MIN_TOTAL_WORDS) problems.push(`total length is ${total} words; needs at least ${MIN_TOTAL_WORDS}`);
  if (words(g.ending) < MIN_ENDING_WORDS) problems.push(`ending is ${words(g.ending)} words; needs at least ${MIN_ENDING_WORDS}`);

  if (g.metaDescription.length < 80 || g.metaDescription.length > 160)
    problems.push(`metaDescription is ${g.metaDescription.length} characters; needs 80 to 160`);
  if (g.keyTakeaways.length < 3 || g.keyTakeaways.length > 5)
    problems.push(`keyTakeaways has ${g.keyTakeaways.length} items; needs 3 to 5`);
  if (g.faq.length < 4 || g.faq.length > 6) problems.push(`faq has ${g.faq.length} items; needs 4 to 6`);

  const qs = new Set();
  for (const f of g.faq) {
    if (!f.q.endsWith("?")) problems.push(`faq question does not end with "?": "${f.q.slice(0, 50)}"`);
    if (words(f.a) < 15) problems.push(`faq answer too short for "${f.q.slice(0, 50)}"`);
    const key = f.q.toLowerCase();
    if (qs.has(key)) problems.push(`duplicate faq question: "${f.q.slice(0, 50)}"`);
    qs.add(key);
  }

  const all = [g.metaDescription, ...g.keyTakeaways, g.recap, g.ending, g.themes, ...g.faq.flatMap((f) => [f.q, f.a])].join("\n");
  for (const re of BANNED) if (re.test(all)) problems.push(`contains banned pattern ${re}`);
  if (title && !all.toLowerCase().includes(title.toLowerCase().slice(0, 30))) problems.push("never mentions the title");
  if (g.ending && g.recap && g.ending.slice(0, 120) === g.recap.slice(0, 120)) problems.push("ending repeats the recap");
  if (sentenceDuplicates(all) > 2) problems.push("repeats the same sentences");

  return problems;
}
