/*
This module provides a server-side Postgres client and shared data access
helpers: connection management plus comment moderation. Likes now live
directly on the movies/anime/franchises rows they belong to (see
lib/api/movies.ts, lib/api/anime.ts, lib/api/franchises.ts) rather than in
a separate table, since every likeable thing here is already one of those
three row types.
*/

import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set.");
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 3,
      // Serverless: release idle connections quickly so a burst of cold ISR
      // renders (every deploy empties the cache) doesn't pin pooler slots,
      // and fail fast instead of hanging until the function times out.
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      allowExitOnIdle: true,
    });
    // Without a listener, an idle client dropped by the pooler emits an
    // unhandled 'error' event that crashes the whole function instance.
    pool.on("error", (err) => console.error("pg pool idle client error:", err.message));
    // Retry once on transient connection failures (pooler client cap hit,
    // connection reset). Crawlers fetch in parallel; a one-off 500 here
    // makes Google slow its crawl rate for the whole site.
    const p = pool;
    const query = p.query.bind(p) as (...a: unknown[]) => Promise<unknown>;
    (p as unknown as { query: unknown }).query = async (...args: unknown[]) => {
      try {
        return await query(...args);
      } catch (err) {
        if (!isTransientDbError(err)) throw err;
        await new Promise((r) => setTimeout(r, 250 + Math.random() * 500));
        return query(...args);
      }
    };
  }
  return pool;
}

function isTransientDbError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  const msg = e?.message ?? "";
  return (
    ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "57P01", "53300", "08006", "08001"].includes(e?.code ?? "") ||
    /MaxClients|too many clients|Connection terminated|timeout exceeded when trying to connect|remaining connection slots/i.test(msg)
  );
}

export type CommentContentType = "ending-explained" | "watch-order";

export interface CommentRow {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export async function getComments(
  contentType: CommentContentType,
  contentSlug: string
): Promise<CommentRow[]> {
  const { rows } = await getPool().query<CommentRow>(
    `select id, author_name, body, created_at from comments
     where content_type = $1 and content_slug = $2
     order by created_at desc`,
    [contentType, contentSlug]
  );
  return rows;
}

export async function addComment(
  contentType: CommentContentType,
  contentSlug: string,
  authorName: string,
  body: string
): Promise<CommentRow> {
  const { rows } = await getPool().query<CommentRow>(
    `insert into comments (content_type, content_slug, author_name, body)
     values ($1, $2, $3, $4)
     returning id, author_name, body, created_at`,
    [contentType, contentSlug, authorName, body]
  );
  return rows[0];
}

export interface TitleRequestRow {
  id: string;
  title: string;
  created_at: string;
}

export async function addTitleRequest(title: string): Promise<TitleRequestRow> {
  const { rows } = await getPool().query<TitleRequestRow>(
    `insert into title_requests (title) values ($1) returning id, title, created_at`,
    [title]
  );
  return rows[0];
}
