/* Small text helpers shared by the guide templates. */

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
export function toParagraphs(text: string | undefined | null, perParagraph = 3): string[] {
  const t = (text ?? "").trim();
  if (!t) return [];
  const blocks = t.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length > 1) return blocks;

  const sentences = t.match(/[^.!?]+(?:[.!?]+["'”’)]*)(?:\s+|$)|[^.!?]+$/g)?.map((s) => s.trim()) ?? [t];
  if (sentences.length <= perParagraph + 1) return [t];

  const out: string[] = [];
  for (let i = 0; i < sentences.length; i += perParagraph) out.push(sentences.slice(i, i + perParagraph).join(" "));
  if (out.length > 1 && out[out.length - 1].split(/(?<=[.!?])\s/).length < 2) {
    const last = out.pop()!;
    out[out.length - 1] += ` ${last}`;
  }
  return out;
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
