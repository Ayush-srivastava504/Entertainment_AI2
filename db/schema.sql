/*
This SQL schema defines the complete Postgres database for marquees.site,
restructured around two content units: Ending Explained guides (one per
movie/anime title) and Watch Order guides (one per franchise). `movies` and
`anime` are internal source data only — they are never rendered or routed
on their own; a title only gets a public URL once its
ending_explained_content is filled in. Safe to run repeatedly against any
Postgres instance (every statement is idempotent).
*/

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- Migration: drop everything the old blog/rankings/quizzes/shorts/chat/
-- on-demand-AI-tools architecture used. Safe to run against a fresh
-- database too (IF EXISTS makes every statement a no-op there).
-- ---------------------------------------------------------------------

drop table if exists blog_posts cascade;
drop table if exists rankings cascade;
drop table if exists quizzes cascade;
drop table if exists shorts cascade;
drop table if exists chat_messages cascade;
drop table if exists queue_jobs cascade;
-- content_type's meaning changes from 'blog'/'quiz' to 'ending-explained'/
-- 'watch-order' below, so old rows are dropped along with their table
-- rather than left orphaned against slugs that no longer resolve.
drop table if exists comments cascade;

-- ---------------------------------------------------------------------
-- Anime (internal source data + ending-explained content)
-- ---------------------------------------------------------------------

create table if not exists anime (
  id             text primary key,
  title          text not null,
  title_english  text,
  synopsis       text,
  poster_url     text,
  trailer_url    text,
  year           integer,
  score          numeric,
  popularity     integer,
  rank           integer,
  episodes       integer,
  status         text,
  type           text,
  genres         text[] not null default '{}',
  studios        text[] not null default '{}',
  aired_from     date,
  aired_to       date,
  raw            jsonb not null,
  source         text not null default 'jikan',
  updated_at     timestamptz not null default now()
);

alter table anime add column if not exists source text not null default 'jikan';
alter table anime add column if not exists slug text;
alter table anime add column if not exists scored_by integer;
alter table anime add column if not exists noindex boolean not null default false;
alter table anime add column if not exists featured boolean not null default false;
alter table anime add column if not exists synopsis_override text;
alter table anime add column if not exists tags text[] not null default '{}';
alter table anime add column if not exists cast_list jsonb;
alter table anime add column if not exists cast_synced_at timestamptz;
alter table anime add column if not exists likes integer not null default 0;

-- Core content unit: the Ending Explained write-up. A row only gets a
-- public /ending-explained/[slug] URL once ending_explained_content is
-- non-null AND passes the ≥700-word publish gate enforced in
-- crawler/ending-explained-generator.mjs (a hard block there, not just a
-- suggestion — a filled column alone doesn't guarantee publish if the
-- word count is short; see ending_explained_word_count).
alter table anime add column if not exists ending_explained_content jsonb;
alter table anime add column if not exists ending_explained_word_count integer;
alter table anime add column if not exists ending_explained_published_at timestamptz;
alter table anime add column if not exists ending_explained_attempted_at timestamptz;
alter table anime add column if not exists ending_explained_skip_reason text;

create index if not exists idx_anime_noindex on anime (noindex) where noindex = true;
create index if not exists idx_anime_tags on anime using gin (tags);
create index if not exists idx_anime_needs_cast on anime (popularity asc nulls last) where cast_list is null;
create index if not exists idx_anime_needs_ending_explained on anime (popularity asc nulls last) where ending_explained_content is null;
create index if not exists idx_anime_published on anime (ending_explained_published_at desc) where ending_explained_content is not null;

create index if not exists idx_anime_score on anime (score desc nulls last);
create index if not exists idx_anime_popularity on anime (popularity asc nulls last);
create index if not exists idx_anime_year on anime (year desc nulls last);
create index if not exists idx_anime_status on anime (status);
create index if not exists idx_anime_genres on anime using gin (genres);
create index if not exists idx_anime_title_trgm on anime using gin (title gin_trgm_ops);
create index if not exists idx_anime_source on anime (source);
create unique index if not exists idx_anime_slug on anime (slug);

-- ---------------------------------------------------------------------
-- Movies (internal source data + ending-explained content)
-- ---------------------------------------------------------------------

create table if not exists movies (
  id              text primary key,
  imdb_code       text,
  tmdb_id         text,
  slug            text,
  title           text not null,
  tagline         text,
  description     text,
  poster_url      text,
  background_url  text,
  trailer_url     text,
  year            integer,
  score           numeric,
  runtime         integer,
  genres          text[] not null default '{}',
  language        text,
  watchers        integer,
  plays           integer,
  list_count      integer,
  released_at     date,
  raw             jsonb not null,
  updated_at      timestamptz not null default now()
);

alter table movies add column if not exists vote_count integer;
alter table movies add column if not exists watch_providers jsonb;
alter table movies add column if not exists watch_providers_synced_at timestamptz;
alter table movies add column if not exists noindex boolean not null default false;
alter table movies add column if not exists featured boolean not null default false;
alter table movies add column if not exists synopsis_override text;
alter table movies add column if not exists tags text[] not null default '{}';
alter table movies add column if not exists cast_list jsonb;
alter table movies add column if not exists cast_synced_at timestamptz;
alter table movies add column if not exists likes integer not null default 0;

-- See the matching comment on the anime table above.
alter table movies add column if not exists ending_explained_content jsonb;
alter table movies add column if not exists ending_explained_word_count integer;
alter table movies add column if not exists ending_explained_published_at timestamptz;
alter table movies add column if not exists ending_explained_attempted_at timestamptz;
alter table movies add column if not exists ending_explained_skip_reason text;

create index if not exists idx_movies_noindex on movies (noindex) where noindex = true;
create index if not exists idx_movies_tags on movies using gin (tags);
create index if not exists idx_movies_needs_cast on movies (watchers desc nulls last) where cast_list is null;
create index if not exists idx_movies_needs_ending_explained on movies (watchers desc nulls last) where ending_explained_content is null;
create index if not exists idx_movies_published on movies (ending_explained_published_at desc) where ending_explained_content is not null;
create index if not exists idx_movies_plays on movies (plays desc nulls last);
create index if not exists idx_movies_list_count on movies (list_count desc nulls last);
create index if not exists idx_movies_year on movies (year desc nulls last);
create index if not exists idx_movies_released on movies (released_at desc nulls last);
create index if not exists idx_movies_genres on movies using gin (genres);
create index if not exists idx_movies_title_trgm on movies using gin (title gin_trgm_ops);
create index if not exists idx_movies_score on movies (score desc nulls last);
create index if not exists idx_movies_watchers on movies (watchers desc nulls last);
create unique index if not exists idx_movies_slug on movies (slug);

-- One-time backfill so rows crawled before slugs existed get a usable,
-- name-based URL immediately instead of waiting for the next crawl run.
update movies set slug =
  trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'))
  || case when year is not null then '-' || year::text else '' end
  || '-' || id
where slug is null;

update anime set slug =
  trim(both '-' from regexp_replace(lower(coalesce(title_english, title)), '[^a-z0-9]+', '-', 'g'))
  || case when year is not null then '-' || year::text else '' end
  || '-' || id
where slug is null;

-- ---------------------------------------------------------------------
-- Franchises (Watch Order guides)
-- ---------------------------------------------------------------------

create table if not exists franchises (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  title             text not null,
  intro             text,
  meta_description  text,
  media_type        text not null default 'movie' check (media_type in ('movie', 'anime', 'mixed')),
  noindex           boolean not null default false,
  featured          boolean not null default false,
  likes             integer not null default 0,
  -- Franchise-level AI-drafted content is flagged for a human pass before
  -- it goes live — see crawler/franchise-watch-order-builder.mjs. A
  -- franchise only appears on /watch-order or gets a sitemap entry once
  -- reviewed_at is set.
  needs_review      boolean not null default true,
  reviewed_at       timestamptz,
  published_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_franchises_published on franchises (published_at desc)
  where noindex = false and needs_review = false;
create index if not exists idx_franchises_needs_review on franchises (needs_review) where needs_review = true;

create table if not exists franchise_entries (
  id            uuid primary key default gen_random_uuid(),
  franchise_id  uuid not null references franchises (id) on delete cascade,
  title_id      text not null,
  media_type    text not null check (media_type in ('movie', 'anime')),
  order_index   integer not null,
  -- release: chronological release date order. chronological: in-story
  -- timeline order. recommended: the AI/editor's suggested best-experience
  -- order (e.g. Machete Order for Star Wars) when it differs from both.
  order_type    text not null default 'release' check (order_type in ('release', 'chronological', 'recommended')),
  note          text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_franchise_entries_franchise on franchise_entries (franchise_id, order_type, order_index);
create index if not exists idx_franchise_entries_title on franchise_entries (media_type, title_id);

-- ---------------------------------------------------------------------
-- Comments — genuinely unique, user-authored content that accumulates on
-- both ending-explained and watch-order pages. content_type distinguishes
-- which merged page a comment belongs to; content_slug is that page's
-- slug (movie/anime slug, or franchise slug).
-- ---------------------------------------------------------------------

create table if not exists comments (
  id            uuid primary key default gen_random_uuid(),
  content_type  text not null check (content_type in ('ending-explained', 'watch-order')),
  content_slug  text not null,
  author_name   text not null,
  body          text not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_comments_lookup on comments (content_type, content_slug, created_at desc);

-- ---------------------------------------------------------------------
-- Crawler / sync bookkeeping
-- ---------------------------------------------------------------------

create table if not exists sync_state (
  source              text primary key,
  last_run_at         timestamptz,
  last_full_sync_at   timestamptz,
  last_pages_crawled  integer,
  last_rows_upserted  integer,
  details             jsonb
);

alter table sync_state add column if not exists details jsonb;
