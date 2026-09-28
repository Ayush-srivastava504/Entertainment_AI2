/*
Generates Ending Explained write-ups for movies/anime that don't have one
yet, via Groq (crawler/lib/ai.mjs). Enforces the 700-word publish gate
described in db/schema.sql: content is only written (and
ending_explained_published_at set) when the generation clears that bar.
Short generations are logged and left null so the next run retries them.

  node crawler/ending-explained-generator.mjs [--table=movies|anime] [--limit=25]
*/

import { getPool, recordSync, sleep } from "./db.mjs";
import { buildPrompt } from "./lib/prompts.mjs";
import { generateWithGroq } from "./lib/ai.mjs";

const args = process.argv.slice(2);
const argValue = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const tableArg = argValue("table");
if (tableArg && !["movies", "anime"].includes(tableArg)) {
  console.error(`[ending-explained] --table must be "movies" or "anime" (got "${tableArg}")`);
  process.exit(1);
}
const TABLES = tableArg ? [tableArg] : ["movies", "anime"];
const LIMIT = Number(argValue("limit") ?? 25);
const MIN_WORDS = 700;
const REQUEST_DELAY_MS = 1500;

const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;

// Parses the RECAP / ENDING / THEMES / FAQ sections into the
// { recap, ending, themes, faq } shape stored in ending_explained_content.
function parseGeneration(text) {
  const names = ["RECAP", "ENDING", "THEMES", "FAQ"];
  const found = names
    .map((name) => ({ name, index: text.search(new RegExp(`^\\s*${name}:`, "m")) }))
    .filter((s) => s.index !== -1)
    .sort((a, b) => a.index - b.index);

  const sections = {};
  found.forEach(({ name, index }, i) => {
    const end = i + 1 < found.length ? found[i + 1].index : text.length;
    sections[name] = text.slice(index, end).replace(new RegExp(`^\\s*${name}:`), "").trim();
  });

  const faq = [];
  const lines = (sections.FAQ ?? "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const q = lines[i].match(/^Q:\s*(.+)/i);
    const a = lines[i + 1]?.match(/^A:\s*(.+)/i);
    if (q && a) {
      faq.push({ q: q[1].trim(), a: a[1].trim() });
      i++;
    }
  }

  return { recap: sections.RECAP ?? "", ending: sections.ENDING ?? "", themes: sections.THEMES ?? "", faq };
}

async function processTable(pool, table) {
  const isAnime = table === "anime";
  const { rows } = await pool.query(
    isAnime
      ? `select id, coalesce(title_english, title) as title, year, genres, cast_list,
                coalesce(synopsis_override, synopsis) as synopsis
         from anime
         where ending_explained_content is null
         order by popularity asc nulls last
         limit $1`
      : `select id, title, year, genres, cast_list,
                coalesce(synopsis_override, description, tagline) as synopsis
         from movies
         where ending_explained_content is null
         order by watchers desc nulls last
         limit $1`,
    [LIMIT]
  );

  console.log(`[ending-explained] ${table}: ${rows.length} queued (limit ${LIMIT})`);
  const stats = { queued: rows.length, published: 0, tooShort: 0, failed: 0 };

  for (const row of rows) {
    try {
      const cast = Array.isArray(row.cast_list)
        ? row.cast_list.slice(0, 6).map((c) => c?.name).filter(Boolean).join(", ")
        : "";

      const prompt = buildPrompt("ending-explained-generate", {
        kind: isAnime ? "anime" : "movie",
        title: row.title,
        year: row.year ? String(row.year) : "",
        genres: Array.isArray(row.genres) ? row.genres.join(", ") : "",
        cast,
        query: (row.synopsis ?? "No synopsis available.").slice(0, 1500),
      });

      const text = await generateWithGroq(prompt, { maxTokens: 2200, temperature: 0.6 });
      const words = wordCount(text);
      const content = parseGeneration(text);

      if (words < MIN_WORDS || !content.ending) {
        stats.tooShort++;
        console.warn(`[ending-explained] ${table}:${row.id} "${row.title}" rejected (${words} words, ending ${content.ending ? "present" : "missing"}).`);
      } else {
        await pool.query(
          `update ${table}
           set ending_explained_content = $1::jsonb,
               ending_explained_word_count = $2,
               ending_explained_published_at = now()
           where id = $3`,
          [JSON.stringify(content), words, row.id]
        );
        stats.published++;
        console.log(`[ending-explained] ${table}:${row.id} "${row.title}" published (${words} words).`);
      }
    } catch (err) {
      stats.failed++;
      console.warn(`[ending-explained] ${table}:${row.id} failed: ${err.message}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }
  return stats;
}

async function main() {
  const pool = getPool();
  try {
    const results = {};
    for (const table of TABLES) results[table] = await processTable(pool, table);
    const published = Object.values(results).reduce((n, r) => n + r.published, 0);
    await recordSync("ending-explained-generator", { rows: published, details: results });
    console.log("[ending-explained] done:", JSON.stringify(results));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[ending-explained] fatal:", err);
  process.exitCode = 1;
});
