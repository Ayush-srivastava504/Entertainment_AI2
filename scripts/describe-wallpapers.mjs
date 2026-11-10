#!/usr/bin/env node
/*
Writes a short, factual description of every wallpaper image to
lib/data/wallpaper-descriptions.json, using Gemini vision on the actual file
in public/. The 94 wallpaper pages were ~90% identical template text
(only the number changed), which is what Google files under "Crawled -
currently not indexed". A real description of what each image shows gives
every page its own content and a descriptive alt text.

  node --env-file=.env scripts/describe-wallpapers.mjs          # only missing ones
  node --env-file=.env scripts/describe-wallpapers.mjs --force  # regenerate all
Review the JSON before committing: it is published on the site.
*/
import fs from "node:fs";
import path from "node:path";

const OUT = "lib/data/wallpaper-descriptions.json";
const MODEL = process.env.GEMINI_VISION_MODEL || "gemini-3.5-flash-lite";
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) throw new Error("GEMINI_API_KEY is not set.");

const src = fs.readFileSync("lib/wallpapers.ts", "utf8");
const items = [...src.matchAll(/slug: "([^"]+)",\s*category: "([^"]+)",[\s\S]*?src: "([^"]+)"/g)].map((m) => ({ slug: m[1], category: m[2], src: m[3] }));
const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const force = process.argv.includes("--force");

const PROMPT = `Describe this anime-style illustration for a wallpaper download page.
Return JSON: {"alt": string, "description": string}.
- "alt": one plain sentence (max 18 words) saying what is visibly in the image.
- "description": 2 sentences (35-60 words) on what the image shows: setting, colours, pose or mood, notable details.
Rules: describe only what is visible; never guess a character name, series or artist;
general-audience wording; no comments on the character's body; no marketing language.`;

let done = 0;
for (const it of items) {
  if (existing[it.slug] && !force) continue;
  const file = path.join("public", it.src);
  const b64 = fs.readFileSync(file).toString("base64");
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: MODEL,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        max_tokens: 600,
        temperature: 0.3,
        messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, { type: "image_url", image_url: { url: `data:image/webp;base64,${b64}` } }] }],
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`);
    const j = JSON.parse((await res.json()).choices[0].message.content);
    if (!j.alt || !j.description) throw new Error("missing fields");
    existing[it.slug] = { alt: j.alt.trim(), description: j.description.trim() };
    fs.writeFileSync(OUT, JSON.stringify(existing, null, 2) + "\n");
    done++;
    console.log(`${it.slug}: ${j.alt}`);
  } catch (e) {
    console.warn(`failed ${it.slug}: ${e.message}`);
  }
}
console.log(`Done: ${done} new, ${Object.keys(existing).length}/${items.length} described.`);
