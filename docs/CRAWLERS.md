# Crawlers and generators

All scripts live in `crawler/`, are plain Node ESM (`.mjs`), and connect via
`DATABASE_URL`. They run on a schedule from `.github/workflows/crawl.yml` and
can be run by hand with the npm scripts below.

## Catalog crawlers

| Script (npm) | Source | Writes |
|---|---|---|
| `anime-sync.mjs` (`crawl:anime`, `crawl:anime:full`) | AniList, then Kitsu, then Jikan (a source is demoted after repeated failures) | `anime` |
| `jikan-crawler.mjs` (`crawl:anime:jikan-only`) | Jikan only, for debugging or backfill | `anime` |
| `anime-cast-crawler.mjs` (`crawl:anime-cast`) | Jikan `/anime/{id}/characters` | `anime.cast_list` |
| `tmdb-crawler.mjs` (`crawl:movies`, `crawl:movies:full`) | TMDB trending, popular, upcoming, top rated | `movies` |
| `watch-providers-crawler.mjs` (`crawl:watch-providers`) | TMDB watch/providers (region from `WATCH_PROVIDERS_REGION`, default `IN`) | `movies.watch_providers`; pings IndexNow when streaming info changes |

`crawl:all` runs anime, movies, watch providers and anime cast in sequence;
`crawl:all:full` does the same with full catalog passes.

## Characters

| Script (npm) | What it does |
|---|---|
| `characters-sync.mjs` (`crawl:characters`) | Fetches popular, trending and lead characters from AniList into `anime_characters`. `--ai` also writes a fact-only overview with Gemini; `--ai-only` only fills missing overviews. `overview` and `noindex` are never overwritten by a re-sync. |
| `trending-leads.mjs` (`generate:leads`) | Writes `lib/data/trending-leads.json` (female leads of trending anime). |

A profile with no bio from the source has nothing to index. Set `noindex =
true` on that row (it drops out of the sitemap automatically) until a bio is
added.

## AI generators (Gemini)

| Script (npm) | What it does |
|---|---|
| `ending-explained-generator.mjs` (`generate:ending-explained`, `:movies`, `:anime`) | Grounds on catalog data and Wikipedia plot text, drafts a structured JSON guide, validates it, then publishes. Titles with too little source material are skipped, not guessed. |
| `watch-order-auto.mjs` (`generate:watch-order`) | Discovers franchises (TMDB collections, Jikan relations), adds missing entries to the catalog, writes the guide. |
| `franchise-watch-order-builder.mjs` (`build:watch-order`) | Builds guides for the hand-kept groups in `franchise-defs.json`. |
| `gif-captions-backfill.mjs` (`generate:gif-captions`) | Writes a caption for every original sticker that has none (`gif_captions`). Run after uploading stickers so `/gif` pages never wait on the model. `--dry-run`, `--limit=N`. |

Shared code is in `crawler/lib/` (`ai`, `prompts`, `quality`, `retry`, `slug`,
`wikipedia`, `indexnow`) and `crawler/sources/`. Models are tried in order:
`GEMINI_MODEL`, then `GEMINI_FALLBACK_MODELS` (default `gemini-3.5-flash-lite`,
then `gemini-3.5-flash`). `AI_DELAY_MS` throttles requests. Gemini 3.x models
are sent `reasoning_effort: "low"` so thinking does not use up the token budget.

> The old default, `gemini-3.8-flash`, does not exist. The API does not
> return an error for it; requests just hang until they time out. If a
> generator suddenly gets slow, check the model name first.

## Image descriptions (scripts/)

| Script | What it does |
|---|---|
| `node --env-file=.env scripts/describe-stickers.mjs` | Writes alt text and a description for each new sticker into `lib/data/sticker-descriptions.json`, using Gemini vision on the actual image. `--force` redoes all. |
| `node --env-file=.env scripts/describe-wallpapers.mjs` | Same for `public/wallpapers` into `lib/data/wallpaper-descriptions.json`. |

Both only add missing entries and are safe to re-run after a 503 ("model is
busy"). Review the JSON before committing: it is published on the site.

## Other scripts

- `migrate.mjs`, `migrate-title-requests.mjs`: apply `db/schema.sql` or the title-requests migration.
- `indexnow-bulk.mjs` (`indexnow:all`): reads the live sitemaps and submits URLs to IndexNow. `--since-hours=N` limits it to recently changed URLs, `--dry` previews.
- `upload-original-gifs.mjs` (`upload:original-gifs`): uploads a local folder to the Supabase `original-gifs` bucket.

## Schedule (UTC, from `crawl.yml`)

| Cron | Job |
|---|---|
| `0 3 * * *` | `crawl`: `npm run crawl:all` |
| `0 5`, `0 13`, `0 21` daily | `generate`: Ending Explained (limit 20 per table), then Watch Order (limit 10) |
| `30 22 * * *` | `indexnow`: push URLs changed in the last 36h |

Jobs only run on every 9th day (the `gate` job), except manual runs.
Separately, `.github/workflows/warm-cache.yml` runs after every successful
production deploy and fetches every sitemap URL once (`npm run warm-cache`).

Run any job manually from the Actions tab ("Run workflow"; choose `crawl`,
`generate`, `indexnow` or `both`).

## Secrets

Add under Settings, Secrets and variables, Actions: `DATABASE_URL`,
`TMDB_API_READ_ACCESS_TOKEN`, `GEMINI_API_KEY`, and optionally `INDEXNOW_KEY`.
GitHub runners have no IPv6, so on Supabase use the **Session pooler**
connection string (port 5432), not the direct one. (Vercel is different: it
should use the transaction pooler, port 6543. See docs/DEPLOYMENT.md.)

## Tests

`npm run test:crawler` runs `crawler/test/quality.test.mjs` (validation of
generated guides).
