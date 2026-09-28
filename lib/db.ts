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
    });
  }
  return pool;
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
