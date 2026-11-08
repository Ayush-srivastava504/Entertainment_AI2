/*
Generates a short caption for a GIF with Gemini and caches it in Postgres
(gif_captions table, see db/schema.sql) so each GIF is captioned once, ever.
Reuses GEMINI_API_KEY, already defined in .env.example for the crawler's
offline generators — this is the same key, used at request time instead.
*/

import { getPool } from "@/lib/db";
import type { GifItem } from "@/lib/api/gifs";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const SYSTEM_PROMPT = `You write short, upbeat captions for an all-ages anime
GIF/sticker site called Animegirl4u. Every caption:
- Is 2-3 sentences, plain text, no markdown.
- Describes the mood/reaction the GIF conveys and a natural moment to use it.
- Stays strictly SFW/general-audience, non-sexual, no commentary on a
  character's body — focus on emotion and use-case, not appearance.
- Never invents specific show/episode names you aren't given.`;

async function generateCaption(title: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Write a caption for this anime GIF. Title/description: "${title}".` },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("[gif-captions] generation failed:", err);
    return null;
  }
}

export async function getOrCreateCaption(item: GifItem): Promise<string | null> {
  const pool = getPool();

  const existing = await pool.query<{ caption: string }>(
    "select caption from gif_captions where media_id = $1",
    [item.id]
  );
  if (existing.rows[0]?.caption) return existing.rows[0].caption;

  const caption = await generateCaption(item.title);
  if (!caption) return null;

  await pool.query(
    `insert into gif_captions (media_id, source, title, caption)
     values ($1, $2, $3, $4)
     on conflict (media_id) do update set caption = excluded.caption`,
    [item.id, item.source, item.title, caption]
  );

  return caption;
}
