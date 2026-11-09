-- Anime character profiles (AniList), written by crawler/characters-sync.mjs
-- and read by the /characters pages. AniList id is the primary key.
create table if not exists anime_characters (
  id               bigint primary key,
  slug             text not null unique,            -- name slug ("mikasa-ackerman"), set by reslug() in the crawler
  name             text not null,
  name_native      text,
  aliases          text[] not null default '{}',
  image_url        text,
  gender           text,
  age              text,
  birthday         text,                            -- "M/D"
  blood_type       text,
  favourites       integer not null default 0,
  about            text,                            -- cleaned AniList description (spoilers removed)
  overview         text,                            -- AI-written, spoiler-free, facts-only summary
  anime            jsonb not null default '[]',     -- appearances: [{id,title,image,year,format,score,role}]
  voice_actors     jsonb not null default '[]',     -- [{name,image,language}]
  collections      text[] not null default '{}',    -- 'popular' | 'trending' | 'lead'
  popular_rank     integer,
  trending_rank    integer,
  source_url       text,
  noindex          boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_anime_characters_popular  on anime_characters (popular_rank)  where popular_rank is not null;
create index if not exists idx_anime_characters_trending on anime_characters (trending_rank) where trending_rank is not null;
create index if not exists idx_anime_characters_fav      on anime_characters (favourites desc);
