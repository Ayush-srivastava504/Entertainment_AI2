/*
Pre-generates the caption for every original GIF/sticker that doesn't have
one yet, and stores it in gif_captions (same table /gif/[id] reads).

Why: a caption generated at request time makes the first visitor (usually
Googlebot, right after a deploy) wait on the model. Generating them here
means every /gif page renders instantly with its unique caption.

  node --env-file=.env crawler/gif-captions-backfill.mjs
  node --env-file=.env crawler/gif-captions-backfill.mjs --dry-run --limit=3
*/

import { getPool } from "./db.mjs";
import { generateWithAI } from "./lib/ai.mjs";

const DRY = process.argv.includes("--dry-run");
const LIMIT = Number((process.argv.find((a) => a.startsWith("--limit=")) || "").split("=")[1]) || Infinity;
const BUCKET = "original-gifs";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const IMAGE_EXT = /\.(gif|png|webp|jpe?g)$/i;

// Must match lib/api/gif-captions.ts so captions read the same either way.
const SYSTEM_PROMPT = `You write short, upbeat captions for an all-ages anime
GIF/sticker site called Animegirl4u. Every caption:
- Is 2-3 sentences, plain text, no markdown.
- Describes the mood/reaction the GIF conveys and a natural moment to use it.
- Stays strictly SFW/general-audience, non-sexual, no commentary on a
  character's body — focus on emotion and use-case, not appearance.
- Never invents specific show/episode names you aren't given.`;

// Same id/title rules as lib/api/original-gifs.ts.
const idOf = (f) => `original-${f.replace(/\.[^.]+$/, "")}`;
const titleOf = (f) => f.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());

if (!SUPABASE_URL || !KEY) throw new Error("NEXT_PUBLIC_SUPABASE_URL and a Supabase key must be set.");
const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
  method: "POST",
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ prefix: "", limit: 1000, offset: 0 }),
});
if (!res.ok) throw new Error(`Storage list failed: ${res.status}`);
const files = (await res.json()).map((f) => f.name).filter((n) => IMAGE_EXT.test(n));

const pool = getPool();
const { rows } = await pool.query("select media_id from gif_captions");
const have = new Set(rows.map((r) => r.media_id));
const todo = files.filter((f) => !have.has(idOf(f))).slice(0, LIMIT);
console.log(`${files.length} files, ${have.size} captioned, ${todo.length} to generate${DRY ? " (dry run)" : ""}`);

let ok = 0, failed = 0;
for (const f of todo) {
  const title = titleOf(f);
  try {
    const caption = (await generateWithAI(`Write a caption for this anime GIF. Title/description: "${title}".`, {
      system: SYSTEM_PROMPT,
      maxTokens: 400,
      temperature: 0.7,
    })).replace(/\s+/g, " ").trim();
    if (DRY) console.log(`  ${idOf(f)}: ${caption}`);
    else
      await pool.query(
        `insert into gif_captions (media_id, source, title, caption) values ($1, 'original', $2, $3)
         on conflict (media_id) do update set caption = excluded.caption`,
        [idOf(f), title, caption]
      );
    ok++;
    if (ok % 20 === 0) console.log(`  ${ok}/${todo.length}`);
  } catch (err) {
    failed++;
    console.warn(`  failed ${f}: ${err.message}`);
  }
}
console.log(`Done: ${ok} captioned, ${failed} failed.`);
await pool.end();
