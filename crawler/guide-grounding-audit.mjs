/*
Content-quality audit for published Ending Explained guides.

A guide is only as good as the source it was written from. Guides generated
from a catalog blurb or a Wikipedia "Premise" section had no facts about the
ending, so their 300-400 word "ending" section is padding or invention. That
is the thin, low-value content Google crawls and then declines to index
("Crawled - currently not indexed"), and enough of it drags down how Google
rates the whole site.

For every indexable guide this re-fetches the Wikipedia plot (the same
lookup the generator uses) and classifies it:

  strong  full Plot/Synopsis/Story section of MIN_FULL_PLOT_CHARS+ (coversEnding())
  weak    premise-only, short plot, or no Wikipedia match at all

Read-only by default: prints a summary and writes the weak list to --out.
With --apply, weak guides get noindex = true. That removes them from the
sitemap, the hubs and Google's index while the URL keeps working for
visitors; it is reversible (set noindex back to false).

  node --env-file=.env crawler/guide-grounding-audit.mjs [--table=movies|anime]
       [--limit=N] [--out=weak-guides.json] [--apply]
*/

import { writeFileSync } from "node:fs";
import { getPool, sleep } from "./db.mjs";
import { fetchPlot, coversEnding, MIN_FULL_PLOT_CHARS } from "./lib/wikipedia.mjs";

const args = process.argv.slice(2);
const argValue = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const TABLES = argValue("table") ? [argValue("table")] : ["movies", "anime"];
const LIMIT = Number(argValue("limit") ?? 100000);
const OUT = argValue("out") ?? "weak-guides.json";
const APPLY = args.includes("--apply");
const DELAY_MS = Number(argValue("delay") ?? 300);

async function main() {
  const pool = getPool();
  const weak = [];
  const summary = {};
  try {
    for (const table of TABLES) {
      if (!["movies", "anime"].includes(table)) throw new Error(`unknown table ${table}`);
      const kind = table === "anime" ? "anime" : "movie";
      const titleCol = table === "anime" ? "coalesce(title_english, title)" : "title";
      const { rows } = await pool.query(
        `select id, slug, ${titleCol} as title, year from ${table}
         where ending_explained_content is not null and noindex = false
         order by id limit $1`,
        [LIMIT]
      );
      const s = { checked: 0, strong: 0, weak: 0, lookupErrors: 0 };
      for (const row of rows) {
        s.checked++;
        let plot = null;
        try {
          plot = await fetchPlot({ title: row.title, year: row.year, kind });
        } catch (err) {
          // Network/API error: not evidence of a weak guide, so leave it alone.
          s.lookupErrors++;
          console.warn(`  lookup failed ${table}:${row.id} "${row.title}": ${err.message}`);
          await sleep(DELAY_MS * 5);
          continue;
        }
        if (coversEnding(plot)) {
          s.strong++;
        } else {
          s.weak++;
          const reason = plot
            ? `"${plot.heading}" section, ${plot.text.length} chars (needs full plot ${MIN_FULL_PLOT_CHARS}+)`
            : "no Wikipedia plot found";
          weak.push({ table, id: row.id, slug: row.slug, title: row.title, reason });
        }
        if (s.checked % 50 === 0) console.log(`  ${table}: ${s.checked}/${rows.length} checked, ${s.weak} weak so far`);
        await sleep(DELAY_MS);
      }
      summary[table] = s;
      console.log(`[audit] ${table}:`, JSON.stringify(s));
    }

    writeFileSync(OUT, JSON.stringify(weak, null, 2));
    console.log(`[audit] ${weak.length} weak guides written to ${OUT}`);

    if (APPLY && weak.length) {
      for (const table of TABLES) {
        const ids = weak.filter((w) => w.table === table).map((w) => w.id);
        if (!ids.length) continue;
        const r = await pool.query(`update ${table} set noindex = true where id::text = any($1::text[])`, [ids.map(String)]);
        console.log(`[audit] ${table}: noindex set on ${r.rowCount} guides`);
      }
    } else if (!APPLY) {
      console.log("[audit] read-only run. Re-run with --apply to set noindex on the weak guides.");
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[audit] fatal:", err.message);
  process.exitCode = 1;
});
