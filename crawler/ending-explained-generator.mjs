/*
Ending Explained generator (v2). Built for accuracy first:

  1. GROUND   Collects real facts: catalog synopsis, cast, genres, and the
              plot section from Wikipedia (crawler/lib/wikipedia.mjs). Titles
              with too little source material are skipped, not guessed.
  2. DRAFT    Asks the model for a structured JSON guide (meta description,
              key takeaways, recap, ending, themes, FAQ).
  3. VALIDATE Deterministic quality gate (crawler/lib/quality.mjs): length,
              structure, banned phrases, duplicates. One repair attempt.
  4. VERIFY   A second model call fact-checks the draft against the sources;
              unsupported claims trigger a revision, then a re-check.
  5. PUBLISH  Only a draft that passes every step is saved. Anything else is
              marked with a reason and retried after a cool-down, so failing
              titles never starve the queue.

  node crawler/ending-explained-generator.mjs [--table=movies|anime] [--limit=20]
       [--id=<row id>] [--no-verify] [--no-wikipedia] [--dry-run]

--dry-run prints the result without saving. DEEPSEEK_MODEL / AI_DELAY_MS apply.
*/

import { getPool, recordSync, sleep } from "./db.mjs";
import { generateWithDeepSeek, getConfiguredModel } from "./lib/ai.mjs";
import { fetchPlot } from "./lib/wikipedia.mjs";
import {
  GUIDE_SYSTEM_PROMPT,
  buildGuidePrompt,
  buildVerifyPrompt,
  buildRevisePrompt,
} from "./lib/prompts.mjs";
import { parseModelJson, normalizeGuide, validateGuide, guideWordCount } from "./lib/quality.mjs";

const args = process.argv.slice(2);
const argValue = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const flag = (name) => args.includes(`--${name}`);

const tableArg = argValue("table");
if (tableArg && !["movies", "anime"].includes(tableArg)) {
  console.error(`[ending-explained] --table must be "movies" or "anime" (got "${tableArg}")`);
  process.exit(1);
}
const TABLES = tableArg ? [tableArg] : ["movies", "anime"];
const LIMIT = Number(argValue("limit") ?? 20);
const ONLY_ID = argValue("id");
const VERIFY = !flag("no-verify");
const USE_WIKIPEDIA = !flag("no-wikipedia");
const DRY_RUN = flag("dry-run");
const REQUEST_DELAY_MS = Number(process.env.AI_DELAY_MS ?? 15_000);
const MAX_CONSECUTIVE_FAILURES = 3;
const RETRY_AFTER_DAYS = 14;
const MIN_GROUNDING_CHARS = 500; // total source text needed to write about a title
const MODEL = getConfiguredModel();

const call = (prompt, opts = {}) =>
  generateWithDeepSeek(prompt, { system: GUIDE_SYSTEM_PROMPT, json: true, maxTokens: 5000, temperature: 0.4, ...opts });

async function ensureColumns(pool) {
  for (const table of ["movies", "anime"]) {
    await pool.query(
      `alter table ${table}
         add column if not exists ending_explained_attempted_at timestamptz,
         add column if not exists ending_explained_skip_reason text`
    );
  }
}

async function markSkipped(pool, table, id, reason) {
  if (DRY_RUN) return;
  await pool.query(
    `update ${table} set ending_explained_attempted_at = now(), ending_explained_skip_reason = $1 where id = $2`,
    [reason.slice(0, 500), id]
  );
}

function loadQueue(pool, table) {
  const isAnime = table === "anime";
  const select = isAnime
    ? `id, coalesce(title_english, title) as title, year, genres, cast_list,
       coalesce(synopsis_override, synopsis) as synopsis`
    : `id, title, year, genres, cast_list,
       coalesce(synopsis_override, description, tagline) as synopsis`;
  const order = isAnime ? "popularity asc nulls last" : "watchers desc nulls last";

  if (ONLY_ID) return pool.query(`select ${select} from ${table} where id = $1`, [ONLY_ID]).then((r) => r.rows);

  return pool
    .query(
      `select ${select} from ${table}
       where ending_explained_content is null
         and (ending_explained_attempted_at is null
              or ending_explained_attempted_at < now() - interval '${RETRY_AFTER_DAYS} days')
       order by ${order}
       limit $1`,
      [LIMIT]
    )
    .then((r) => r.rows);
}

async function gatherFacts(row, kind) {
  const cast = Array.isArray(row.cast_list)
    ? row.cast_list.slice(0, 8).map((c) => c?.name).filter(Boolean).join(", ")
    : "";
  const facts = {
    kind,
    title: row.title,
    year: row.year ? String(row.year) : "",
    genres: Array.isArray(row.genres) ? row.genres.join(", ") : "",
    cast,
    catalogSynopsis: (row.synopsis ?? "").trim().slice(0, 2000),
    plot: "",
    sources: ["catalog"],
    plotUrl: null,
  };

  if (USE_WIKIPEDIA) {
    try {
      const wiki = await fetchPlot({ title: row.title, year: row.year, kind });
      if (wiki) {
        facts.plot = wiki.text;
        facts.plotUrl = wiki.url;
        facts.sources.push("wikipedia");
      }
    } catch (err) {
      console.warn(`    [wikipedia] lookup failed for "${row.title}": ${err.message}`);
    }
  }
  return facts;
}

/** Runs draft -> validate/repair -> verify/revise. Returns { guide } or { reason }. */
async function produceGuide(facts) {
  let guide = normalizeGuide(parseModelJson(await call(buildGuidePrompt(facts))));
  let problems = validateGuide(guide, { title: facts.title });

  if (problems.length) {
    console.warn(`    draft needs repair: ${problems.slice(0, 3).join("; ")}`);
    await sleep(REQUEST_DELAY_MS);
    guide = normalizeGuide(parseModelJson(await call(buildRevisePrompt(facts, guide, problems))));
    problems = validateGuide(guide, { title: facts.title });
    if (problems.length) return { reason: `failed quality gate: ${problems.slice(0, 4).join("; ")}` };
  }

  if (VERIFY) {
    for (let round = 1; round <= 2; round++) {
      await sleep(REQUEST_DELAY_MS);
      const verdict = parseModelJson(await call(buildVerifyPrompt(facts, guide), { maxTokens: 2500, temperature: 0 }));
      const unsupported = Array.isArray(verdict.unsupported) ? verdict.unsupported : [];
      if (unsupported.length === 0) return { guide, verified: true };

      console.warn(`    fact-check round ${round}: ${unsupported.length} unsupported claim(s)`);
      if (round === 2) {
        return { reason: `fact-check failed: ${unsupported.slice(0, 2).map((u) => u.claim).join(" | ").slice(0, 300)}` };
      }
      await sleep(REQUEST_DELAY_MS);
      const issues = unsupported.map((u) => `Unsupported: "${u.claim}" (${u.reason})`);
      guide = normalizeGuide(parseModelJson(await call(buildRevisePrompt(facts, guide, issues))));
      const again = validateGuide(guide, { title: facts.title });
      if (again.length) return { reason: `revision failed quality gate: ${again.slice(0, 3).join("; ")}` };
    }
  }
  return { guide, verified: VERIFY };
}

async function processTable(pool, table) {
  const kind = table === "anime" ? "anime" : "movie";
  const rows = await loadQueue(pool, table);
  console.log(`[ending-explained] ${table}: ${rows.length} queued (limit ${LIMIT}, verify=${VERIFY}, model=${MODEL})`);

  const stats = { queued: rows.length, published: 0, skipped: 0, rejected: 0, failed: 0 };
  let consecutiveFailures = 0;

  for (const row of rows) {
    const label = `${table}:${row.id} "${row.title}"`;
    try {
      const facts = await gatherFacts(row, kind);
      const groundingChars = facts.catalogSynopsis.length + facts.plot.length;
      if (groundingChars < MIN_GROUNDING_CHARS) {
        stats.skipped++;
        await markSkipped(pool, table, row.id, `not enough source material (${groundingChars} chars)`);
        console.warn(`[ending-explained] ${label} skipped: only ${groundingChars} chars of source facts.`);
        continue;
      }

      const result = await produceGuide(facts);
      if (!result.guide) {
        stats.rejected++;
        await markSkipped(pool, table, row.id, result.reason);
        console.warn(`[ending-explained] ${label} rejected: ${result.reason}`);
      } else {
        const words = guideWordCount(result.guide);
        const content = {
          ...result.guide,
          meta: {
            model: MODEL,
            generatedAt: new Date().toISOString(),
            sources: facts.sources,
            verified: Boolean(result.verified),
            plotSource: facts.plotUrl,
          },
        };
        if (DRY_RUN) {
          console.log(JSON.stringify(content, null, 2));
        } else {
          await pool.query(
            `update ${table}
             set ending_explained_content = $1::jsonb,
                 ending_explained_word_count = $2,
                 ending_explained_published_at = now(),
                 ending_explained_attempted_at = now(),
                 ending_explained_skip_reason = null
             where id = $3`,
            [JSON.stringify(content), words, row.id]
          );
        }
        stats.published++;
        console.log(`[ending-explained] ${label} ${DRY_RUN ? "passed (dry run)" : "published"} (${words} words, sources: ${facts.sources.join("+")}, verified=${Boolean(result.verified)}).`);
      }
      consecutiveFailures = 0;
    } catch (err) {
      // Transient/API failures: do not mark the title, so it is retried next run.
      stats.failed++;
      consecutiveFailures++;
      console.warn(`[ending-explained] ${label} failed: ${err.message}`);
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.warn("[ending-explained] too many failures in a row (likely a rate or daily limit); stopping this table.");
        break;
      }
    }
    await sleep(REQUEST_DELAY_MS);
  }
  return stats;
}

async function main() {
  const pool = getPool();
  try {
    await ensureColumns(pool);
    const results = {};
    for (const table of TABLES) results[table] = await processTable(pool, table);
    const published = Object.values(results).reduce((n, r) => n + r.published, 0);
    if (!DRY_RUN) await recordSync("ending-explained-generator", { rows: published, details: results });
    console.log("[ending-explained] done:", JSON.stringify(results));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[ending-explained] fatal:", err.message);
  process.exitCode = 1;
});
