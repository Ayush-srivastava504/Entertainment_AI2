create table if not exists title_requests (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_title_requests_created on title_requests (created_at desc);