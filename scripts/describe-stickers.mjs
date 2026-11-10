#!/usr/bin/env node
/*
Writes a short, factual description of every original sticker/GIF in the
Supabase "original-gifs" bucket to lib/data/sticker-descriptions.json,
using Gemini vision on the actual image. Collection pages and /gif pages
were ~80 and ~20 words of mostly shared text; these give each sticker its
own description and a descriptive alt text.

  node --env-file=.env scripts/describe-stickers.mjs          # only missing ones
  node --env-file=.env scripts/describe-stickers.mjs --force  # regenerate all
Review the JSON before committing: it is published on the site.
*/
import fs from "node:fs";

const OUT = "lib/data/sticker-descriptions.json";
const MODEL = process.env.GEMINI_VISION_MODEL || "gemini-3.5-flash-lite";
const KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SKEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!KEY || !SUPABASE_URL || !SKEY) throw new Error("GEMINI_API_KEY and Supabase env vars must be set.");

const MIME = { gif: "image/gif", png: "image/png", webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg" };
const list = await fetch(`${SUPABASE_URL}/storage/v1/object/list/original-gifs`, {
  method: "POST",
  headers: { apikey: SKEY, Authorization: `Bearer ${SKEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ prefix: "", limit: 1000, offset: 0 }),
});
const files = (await list.json()).map((f) => f.name).filter((n) => MIME[n.split(".").pop().toLowerCase()]);
const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const force = process.argv.includes("--force");

const PROMPT = `Describe this anime-style sticker for its download page. The file is titled "TITLE".
Return JSON: {"alt": string, "description": string}.
- "alt": one plain sentence (max 16 words) saying what is visibly in the image.
- "description": 1-2 sentences (20-40 words): the pose, expression, props, colours and the mood or reaction it conveys.
Rules: describe only what is visible; you may use a character name only if it appears in the title; never guess a series
or artist that is not in the title; general-audience wording; no comments on the character's body; no marketing language.`;

let done = 0;
for (const f of files) {
  const id = `original-${f.replace(/\.[^.]+$/, "")}`;
  if (existing[id] && !force) continue;
  const title = f.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  try {
    const img = await fetch(`${SUPABASE_URL}/storage/v1/object/public/original-gifs/${encodeURIComponent(f)}`);
    if (!img.ok) throw new Error(`image ${img.status}`);
    const b64 = Buffer.from(await img.arrayBuffer()).toString("base64");
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(45000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: MODEL,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        max_tokens: 600,
        temperature: 0.3,
        messages: [{ role: "user", content: [
          { type: "text", text: PROMPT.replace("TITLE", title) },
          { type: "image_url", image_url: { url: `data:${MIME[f.split(".").pop().toLowerCase()]};base64,${b64}` } },
        ] }],
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 100)}`);
    const j = JSON.parse((await res.json()).choices[0].message.content);
    if (!j.alt || !j.description) throw new Error("missing fields");
    existing[id] = { alt: j.alt.trim(), description: j.description.trim() };
    fs.writeFileSync(OUT, JSON.stringify(existing, null, 2) + "\n");
    done++;
    console.log(`${id}: ${j.description}`);
  } catch (e) {
    console.warn(`failed ${id}: ${e.message.split("\n")[0]}`);
  }
}
console.log(`Done: ${done} new, ${Object.keys(existing).length}/${files.length} described.`);
