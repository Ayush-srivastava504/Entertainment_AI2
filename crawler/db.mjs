/*
This module provides database utility functions for crawlers, including
connection management, sync state recording, and batch upsert operations
for anime data. It handles transaction management
and conflict resolution for each data type.
*/

import pg from "pg";
import { buildMediaSlug } from "./lib/slug.mjs";

const { Pool } = pg;
let pool;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set. Export it or add it to .env and run with --env-file=.env");
    }
    // GitHub Actions runners have no IPv6. Supabase's direct host
    // (db.<ref>.supabase.co) resolves to IPv6 only, so it fails there with
    // ENETUNREACH. Use the pooler URL (…pooler.supabase.com) instead.
    if (process.env.GITHUB_ACTIONS && /@db\.[a-z0-9]+\.supabase\.co/.test(connectionString)) {
      console.warn(
        "[db] DATABASE_URL uses Supabase's IPv6-only direct host, which GitHub Actions cannot reach. " +
          "Set the secret to the Session pooler connection string (aws-…pooler.supabase.com:5432)."
      );
    }
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 4 });
  }
  return pool;
}

export async function recordSync(source, { pages, rows, full, details } = {}) {
  const client = getPool();
  await client.query(
    `insert into sync_state (source, last_run_at, last_full_sync_at, last_pages_crawled, last_rows_upserted, details)
     values ($1, now(), case when $4 then now() else null end, $2, $3, $5)
     on conflict (source) do update set
       last_run_at = now(),
       last_full_sync_at = case when $4 then now() else sync_state.last_full_sync_at end,
       last_pages_crawled = $2,
       last_rows_upserted = $3,
       details = $5`,
    [source, pages, rows, full, details ? JSON.stringify(details) : null]
  );
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function upsertAnimeBatch(rows) {
  if (rows.length === 0) return 0;
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const r of rows) {
      const slug = buildMediaSlug(r.title_english || r.title, r.year, r.id);
      await client.query(
        `insert into anime (id, title, title_english, synopsis, poster_url, trailer_url, year, score, scored_by,
                             popularity, rank, episodes, status, type, genres, studios, aired_from, aired_to,
                             raw, source, slug, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,now())
         on conflict (id) do update set
           title = excluded.title, title_english = excluded.title_english, synopsis = excluded.synopsis,
           poster_url = excluded.poster_url, trailer_url = excluded.trailer_url, year = excluded.year,
           score = excluded.score, scored_by = excluded.scored_by, popularity = excluded.popularity, rank = excluded.rank,
           episodes = excluded.episodes, status = excluded.status, type = excluded.type,
           genres = excluded.genres, studios = excluded.studios, aired_from = excluded.aired_from,
           aired_to = excluded.aired_to, raw = excluded.raw, source = excluded.source, slug = excluded.slug,
           updated_at = now()`,
        // Note: this batch upsert intentionally never touches noindex,
        // featured, synopsis_override, tags, or cast_list — those are
        // editor/AI-owned columns (admin panel, elaborate-descriptions.mjs,
        // anime-cast-crawler.mjs) and must survive a plain re-sync untouched.
        [
          r.id, r.title, r.title_english, r.synopsis, r.poster_url, r.trailer_url, r.year, r.score, r.scored_by,
          r.popularity, r.rank, r.episodes, r.status, r.type, r.genres, r.studios, r.aired_from, r.aired_to,
          JSON.stringify(r.raw), r.source, slug,
        ]
      );
    }
    await client.query("commit");
    return rows.length;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}