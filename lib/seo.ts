/* Small text helpers shared by the guide templates. */

import { SITE_NAME } from "@/lib/site";

/** Trims to a search-snippet length on a word boundary, adding an ellipsis only when it cut. */
export function snippet(text: string, max = 158): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : cut.length).replace(/[,;:\s]+$/, "")}…`;
}

/**
 * The generator stores each section as one long block. Walls of text hurt
 * scanning, dwell time and snippet extraction, so split at render time:
 * honour real blank-line breaks if there are any, otherwise group sentences
 * into short paragraphs (3 per paragraph, no one-sentence orphan at the end).
 */
// Stand-in for a period that must not end a sentence (restored on output).
const KEEP_DOT = "․";
const ABBREVIATIONS = /\b(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|vs|Vol|Mt|Lt|Capt|Prof|Sgt|Ep|feat)\./g;

/**
 * `protect` lists phrases whose periods are not sentence ends, normally the
 * title itself: without it "Kill. Bury. Print." was split into its own
 * paragraph and the sentence it started was cut in half.
 */
export function toParagraphs(text: string | undefined | null, perParagraph = 3, protect: (string | undefined)[] = []): string[] {
  const original = (text ?? "").trim();
  if (!original) return [];
  const blocks = original.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length > 1) return blocks;

  let t = original;
  for (const p of protect) if (p && p.includes(".")) t = t.split(p).join(p.replace(/\./g, KEEP_DOT));
  t = t.replace(ABBREVIATIONS, (m) => m.replace(".", KEEP_DOT));
  // "U.S.", "e.g." and similar: a period directly followed by a letter is never a sentence end.
  t = t.replace(/\.(?=[A-Za-z]\.)/g, KEEP_DOT);

  // A sentence ends at . ! or ? (plus closing quotes/brackets) followed by
  // whitespace and a capital letter, digit or opening quote.
  const sentences = t
    .split(/(?<=[.!?]["'”’)]*)\s+(?=["'“‘(]?[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length <= perParagraph + 1) return [original];

  const groups: string[][] = [];
  for (let i = 0; i < sentences.length; i += perParagraph) groups.push(sentences.slice(i, i + perParagraph));
  // No one-sentence orphan at the end.
  if (groups.length > 1 && groups[groups.length - 1].length < 2) {
    const last = groups.pop()!;
    groups[groups.length - 1].push(...last);
  }
  return groups.map((g) => g.join(" ").split(KEEP_DOT).join("."));
}

export function readingMinutes(wordCount?: number): number {
  return Math.max(1, Math.round((wordCount ?? 600) / 220));
}

export function formatDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * Search titles get cut off past ~60 characters. Returns the first variant
 * that fits with " | Animegirl4u" appended, else the first that fits without
 * it, else the last variant truncated. Pass variants from most to least
 * descriptive, keyword first.
 */
export function fitTitle(variants: string[], max = 60): string {
  const suffix = ` | ${SITE_NAME}`;
  for (const v of variants) if (v.length + suffix.length <= max) return v + suffix;
  for (const v of variants) if (v.length <= max) return v;
  const last = variants[variants.length - 1];
  return `${last.slice(0, max - 1).trimEnd()}…`;
}
