/*
Drafts Watch Order guides from crawler/franchise-defs.json — a hand-kept
list of which catalog titles belong to which franchise (grouping quality
can't be reliably auto-detected). For each definition this:

  1. Upserts the franchise row and its "release" order entries.
  2. Asks Groq for an intro plus a recommended order with per-entry notes.
  3. Writes the "recommended" entries and the intro.

needs_review is never touched on an existing franchise and defaults to
true on insert (see db/schema.sql): a human must flip it before the guide
appears on /watch-order or in the sitemap.

franchise-defs.json format:
[
  {
    "slug": "the-matrix",
    "title": "The Matrix",
    "mediaType": "movie",              // "movie" | "anime" | "mixed"
    "entries": [
      { "titleId": "603", "mediaType": "movie", "releaseOrder": 1 }
    ]
  }
]
titleId must already exist in movies/anime (run the crawlers first).

  node crawler/franchise-watch-order-builder.mjs [--slug=the-matrix]
*/

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getPool, recordSync, sleep } from "./db.mjs";
import { buildPrompt } from "./lib/prompts.mjs";
import { generateWithGemini } from "./lib/ai.mjs";

const defsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "franchise-defs.json");
const onlySlug = process.argv.slice(2).find((a) => a.startsWith("--slug="))?.split("=")[1];
const REQUEST_DELAY_MS = Number(process.env.AI_DELAY_MS ?? 15_000);

function loadDefinitions() {
  try {
    const defs = JSON.parse(readFileSync(defsPath, "utf-8"));
    return Array.isArray(defs) ? defs : [];
  } catch (err) {
    console.error(`[franchise-watch-order] cannot read ${defsPath}: ${err.message}`);
    return [];
  }
}

async function lookupTitle(pool, mediaType, titleId) {
  const sql =
    mediaType === "anime"
      ? "select id, coalesce(title_english, title) as title, year from anime where id = $1"
      : "select id, title, year from movies where id = $1";
  const { rows } = await pool.query(sql, [titleId]);
  return rows[0] ?? null;
}

// Splits the draft into { intro, order: [label], notes: Map(title -> note) }.
function parseDraft(text) {
  const firstNumbered = text.search(/^\s*\d+[.)]\s/m);
  const intro = (firstNumbered > 0 ? text.slice(0, firstNumbered) : "").trim().slice(0, 700);
  const order = [];
  const notes = new Map();
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim();
    const numbered = line.match(/^\d+[.)]\s*(.+)/);
    if (numbered) {
      order.push(numbered[1].trim());
      continue;
    }
    const note = line.match(/^NOTE\s+(.+?):\s*(.+)/i);
    if (note) notes.set(note[1].trim().toLowerCase(), note[2].trim());
  }
  return { intro, order, notes };
}

async function replaceEntries(client, franchiseId, orderType, entries) {
  await client.query("delete from franchise_entries where franchise_id = $1 and order_type = $2", [franchiseId, orderType]);
  for (const e of entries) {
    await client.query(
      `insert into franchise_entries (franchise_id, title_id, media_type, order_index, order_type, note)
       values ($1, $2, $3, $4, $5, $6)`,
      [franchiseId, e.titleId, e.mediaType, e.orderIndex, orderType, e.note ?? null]
    );
  }
}

async function processDefinition(pool, def) {
  const resolved = [];
  for (const entry of def.entries ?? []) {
    const row = await lookupTitle(pool, entry.mediaType, String(entry.titleId));
    if (!row) {
      console.warn(`[franchise-watch-order] ${def.slug}: ${entry.mediaType}:${entry.titleId} not in catalog, skipping entry.`);
      continue;
    }
    resolved.push({ titleId: String(entry.titleId), mediaType: entry.mediaType, releaseOrder: entry.releaseOrder ?? 0, title: row.title, year: row.year });
  }
  if (resolved.length === 0) return { skipped: true };
  resolved.sort((a, b) => a.releaseOrder - b.releaseOrder);

  const label = (e) => `${e.title}${e.year ? ` (${e.year})` : ""}`;
  const draftText = await generateWithGemini(
    buildPrompt("watch-order-draft", { title: def.title, query: resolved.map(label).join("; ") }),
    { maxTokens: 3000, temperature: 0.5 }
  );
  const { intro, order, notes } = parseDraft(draftText);

  // Match each AI-listed label back to a catalog entry; unmatched labels
  // are dropped and any entry the AI omitted is appended so nothing is lost.
  const used = new Set();
  const recommended = [];
  for (const labelText of order) {
    const match = resolved.find((e) => !used.has(e.titleId + e.mediaType) && labelText.toLowerCase().includes(e.title.toLowerCase()));
    if (!match) continue;
    used.add(match.titleId + match.mediaType);
    recommended.push({ ...match, note: notes.get(match.title.toLowerCase()) ?? null });
  }
  for (const e of resolved) if (!used.has(e.titleId + e.mediaType)) recommended.push({ ...e, note: null });

  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query(
      `insert into franchises (slug, title, media_type, intro)
       values ($1, $2, $3, $4)
       on conflict (slug) do update
         set title = excluded.title,
             media_type = excluded.media_type,
             intro = coalesce(excluded.intro, franchises.intro),
             updated_at = now()
       returning id`,
      [def.slug, def.title, def.mediaType ?? "movie", intro || null]
    );
    const franchiseId = rows[0].id;
    await replaceEntries(client, franchiseId, "release", resolved.map((e, i) => ({ ...e, orderIndex: i + 1 })));
    await replaceEntries(client, franchiseId, "recommended", recommended.map((e, i) => ({ ...e, orderIndex: i + 1 })));
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }

  console.log(`[franchise-watch-order] ${def.slug}: drafted ${resolved.length} entries (awaiting review).`);
  return { skipped: false };
}

async function main() {
  const defs = loadDefinitions().filter((d) => !onlySlug || d.slug === onlySlug);
  if (defs.length === 0) {
    console.log("[franchise-watch-order] nothing to do — add franchises to crawler/franchise-defs.json.");
    return;
  }

  const pool = getPool();
  const stats = { drafted: 0, skipped: 0, failed: 0 };
  try {
    for (const def of defs) {
      try {
        const r = await processDefinition(pool, def);
        if (r.skipped) stats.skipped++;
        else stats.drafted++;
      } catch (err) {
        stats.failed++;
        console.warn(`[franchise-watch-order] ${def.slug} failed: ${err.message}`);
      }
      await sleep(REQUEST_DELAY_MS);
    }
    await recordSync("franchise-watch-order-builder", { rows: stats.drafted, details: stats });
    console.log("[franchise-watch-order] done:", JSON.stringify(stats));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[franchise-watch-order] fatal:", err);
  process.exitCode = 1;
});
