# Animegirl4u

Anime and movie guide site built with Next.js 16 (App Router, TypeScript,
Tailwind), deployed on Vercel. Live at <https://animegirl4u.com>.

- **Ending Explained** guides for anime and movies, and **Watch Order** guides for franchises
- **Anime character profiles** (bios, voice actors, appearances)
- Free **stickers, GIFs and wallpapers**, plus an in-browser **sticker maker**
- Browser **mini-games** with coins and collectible avatars
- An **Android app** (Capacitor wrapper around the live site)

---

## Architecture

```
GitHub Actions (crawl.yml)       crawlers + AI generators  ->  Postgres (Supabase)
GitHub Actions (warm-cache.yml)  after each deploy: fetch every sitemap URL once
Vercel (Next.js)                 reads Postgres, Supabase Storage, Upstash Redis (optional)
Browser                          sticker maker + optional on-device AI, games, favorites
Android app (mobile/)            Capacitor shell that loads the live site
```

- **Postgres is the source of truth** for catalog content. Pages read the
  database; nothing calls TMDB, AniList or Jikan while serving a page, except
  the live Jikan fallback for character pages that are not saved yet.
- **Request-time external calls:** Supabase Storage (sticker/GIF file list)
  and, only as a fallback, Gemini for a GIF caption that was not
  pre-generated.
- **Caching:** guide, character and GIF pages use ISR (cached for an hour).
  `lib/cache.ts` caches database reads in Upstash Redis when configured,
  otherwise in memory.
- **No accounts.** Favorites, coins and avatars live in the visitor's
  localStorage. The admin panel has one password.

---

## Routes

| Area | Routes | Notes |
|---|---|---|
| Home | `/` | Hub with links to every section |
| Ending Explained | `/ending-explained`, `/ending-explained/[slug]`, `/ending-explained/topic/[topic]` | Paginated hub; `?type=movie\|anime` filters are noindex |
| Watch Order | `/watch-order`, `/watch-order/[franchise]`, `/watch-order/topic/[topic]` | |
| Characters | `/anime-characters`, `/anime-characters/[slug]`, `/anime-characters/leads`, `/anime-characters/leads/[slug]` | `/characters/*` permanently redirects here |
| Stickers and GIFs | `/stickers`, `/stickers/[collection]`, `/stickers/maker`, `/gif/[id]` | See [docs/STICKER_MAKER.md](docs/STICKER_MAKER.md) |
| Wallpapers | `/wallpapers`, `/wallpapers/category/[category]`, `/wallpapers/[slug]` | |
| Games | `/games`, `/games/{memory,match3,tetris,g2048,snake,whack,minesweeper,tictactoe,simon,reaction,four,slide,spin}` | noindex by design |
| Other pages | `/about`, `/privacy`, `/delete-data`, `/search`, `/favorites` | search and favorites are noindex |
| Legacy URLs | `/movies/*`, `/anime/*`, `/genres/*`, `/rankings/*` | Redirect to the matching guide or return 410 |
| Admin | `/admin`, `/admin/login`, `/admin/{anime,movies,comments,title-requests}` | Password protected (`middleware.ts`) |
| SEO and infra | `/sitemap.xml`, `/sitemaps/[name]`, `/robots.txt`, `/manifest.webmanifest`, `/<INDEXNOW_KEY>.txt`, `/.well-known/assetlinks.json` | See [docs/SEO.md](docs/SEO.md) |

A title only gets a public URL once its guide has been generated. The
`movies` and `anime` tables are source data, not pages.

---

## Folder and file guide

### Top level

| Path | What it is |
|---|---|
| `app/` | Next.js routes (pages, API routes, sitemaps, robots, manifest) |
| `components/` | React components |
| `lib/` | Server and shared helpers: database, cache, SEO, data access, sticker/wallpaper data, games logic |
| `crawler/` | Node scripts that fill the database (crawlers, AI generators, migrations); run by GitHub Actions or by hand |
| `scripts/` | Maintenance scripts: cache warming, SEO audit, image descriptions |
| `db/` | `schema.sql` (idempotent, safe to re-run) and dated one-off migrations |
| `mobile/` | Capacitor Android app ([docs/MOBILE.md](docs/MOBILE.md)) |
| `public/` | Static files: hero GIFs, wallpapers, game art, icons, logo |
| `docs/` | Documentation (index at the end of this file) |
| `.github/workflows/` | `crawl.yml` (scheduled crawls and generators), `warm-cache.yml` (cache warming after deploys) |
| `middleware.ts` | Protects `/admin` and `/api/admin`; blocks admin inside the Android app |
| `next.config.js` | www to apex redirect, `/characters` redirects, security headers, bot list that gets metadata in `<head>` |
| `.env.example` | Every environment variable, with comments |
| `SECURITY.md` | Security notes and checklist |

### `app/` (routes)

| Path | What it does |
|---|---|
| `layout.tsx` | Root layout: site metadata, Organization/WebSite JSON-LD, nav, footer, analytics |
| `page.tsx` | Homepage |
| `error.tsx`, `not-found.tsx` | Error and 404 pages |
| `robots.ts` | robots.txt; lists the sitemap index and every child sitemap |
| `sitemap.xml/route.ts`, `sitemaps/[name]/route.ts` | Sitemap index and child sitemaps (built in `lib/sitemap.ts`) |
| `manifest.ts` | Web app manifest |
| `[key]/route.ts` | Serves the IndexNow key file at `/<INDEXNOW_KEY>.txt` |
| `.well-known/assetlinks.json/route.ts` | Android App Links verification |
| `ending-explained/...` | Guide hub (paginated), guide pages, topic hubs |
| `watch-order/...` | Franchise hub, franchise pages, topic hubs |
| `anime-characters/...` | Characters hub (trending, top 100, search), profiles, trending female leads |
| `stickers/page.tsx` | Sticker hub: search, collections, "Make your own sticker" card |
| `stickers/[collection]/page.tsx` | One collection, with a "What's in the collection" list |
| `stickers/maker/page.tsx` | Sticker maker page (editor in `components/stickers/StickerMaker.tsx`) |
| `gif/[id]/page.tsx` | One sticker/GIF: description, caption, details, Download, Share, "Make WhatsApp sticker" |
| `wallpapers/...` | Wallpaper gallery, category pages, wallpaper pages |
| `games/...` | Games hub and one folder per game (client components); `layout.tsx` sets noindex |
| `about`, `privacy`, `delete-data`, `search`, `favorites` | Static and utility pages |
| `movies`, `anime`, `genres`, `rankings` | Legacy URL handlers (`lib/legacy.ts`) |
| `admin/...` | Admin pages: titles, comments, title requests, login |
| `api/og` | Dynamic Open Graph images |
| `api/search` | Title search (JSON) |
| `api/comments`, `api/like`, `api/favorites`, `api/title-requests` | Public write endpoints (rate limited) |
| `api/games/spin` | Spin wheel: picks an avatar the player does not own yet |
| `api/push/register`, `api/push/unregister` | Android push tokens |
| `api/revalidate` | On-demand cache clearing (`REVALIDATION_SECRET`) |
| `api/admin/*` | Admin API (login, logout, stats, titles, comments, title requests) |

### `components/`

| Path | What it does |
|---|---|
| `Nav.tsx`, `Footer.tsx` | Site header and footer (footer carries most internal links) |
| `NavigationLoader.tsx` | Branded loading screen between pages |
| `HeroGifRotator.tsx` | Random hero GIF on the homepage (from `public/hero/`) |
| `AppBridge.tsx` | Android app integration: push registration, native share |
| `ShareButton.tsx`, `LikeButton.tsx`, `FavoriteButton.tsx` | Share, like and save buttons |
| `CommentSection.tsx`, `TitleRequestForm.tsx` | Comments on guides; "request a title" form |
| `ui/` | `Breadcrumbs`, `Pagination` (with jump links every 5 pages), `PageHero`, `Faq` (also emits FAQPage JSON-LD), `CtaBand`, `Slate` (fact table), `SpoilerGate` (blurred spoilers, text stays in the HTML) |
| `media/` | `MediaCard`, `MediaGrid`, `SearchBar`, `SimilarTitles`, `BarChart` (CSS-only chart) |
| `topics/TopicLinks.tsx` | Topic hub links |
| `home/AnimeGirlGuide.tsx` | Homepage guide section |
| `stickers/StickerCard.tsx` | Sticker tile with download button |
| `stickers/StickerMaker.tsx` | The sticker editor (see [docs/STICKER_MAKER.md](docs/STICKER_MAKER.md)) |
| `wallpapers/` | `WallpaperCard`, `WallpaperDownloadCard` |
| `games/` | `CoinBadge`, `AvatarCollection` |
| `admin/` | Admin tables and forms, logout button |

### `lib/`

| Path | What it does |
|---|---|
| `db.ts` | Postgres pool (error handler, timeouts, one retry on transient errors), comments and title requests |
| `cache.ts` | TTL cache for database reads: Upstash Redis when configured, otherwise in memory |
| `site.ts` | Canonical base URL and site name |
| `sitemap.ts`, `sitemap-response.ts` | Sitemap builders (`INCLUDE_MOVIES` switch) and a response wrapper that never serves a broken sitemap |
| `jsonld.ts`, `og.ts`, `seo.ts`, `faq.ts` | Structured data helpers, share-card metadata (`socialMeta`), title/snippet helpers, static FAQ copy |
| `indexnow.ts` | Submits changed URLs to IndexNow |
| `legacy.ts` | Handles old `/movies`, `/anime`, `/genres`, `/rankings` URLs |
| `slug.ts`, `image.ts`, `search.ts`, `topics.ts` | Slugs, responsive poster URLs, search, topic hub definitions |
| `analytics.ts`, `favorites.ts` | gtag wrapper; localStorage favorites |
| `admin-auth.ts`, `admin-db.ts` | Admin password and signed session; admin queries |
| `characters.ts`, `characters-db.ts` | Live Jikan character data (fallback); saved character profiles in `anime_characters` |
| `wallpapers.ts` | Wallpaper list and categories, merged with `data/wallpaper-descriptions.json` |
| `sticker-collections.ts` | Sticker collections by filename prefix, plus the catch-all "Reactions" collection |
| `anime-cutout.ts` | Optional on-device anime AI cut-out for the sticker maker (browser only, loaded on demand) |
| `api/` | Data access: `anime`, `movies`, `franchises`, `guides`, `hub`, `normalize` (guide content shape), `gifs`, `original-gifs` (Supabase Storage list + descriptions), `gif-captions` (Gemini captions cached in Postgres) |
| `games/` | `wallet` (coins), `collection` (owned avatars), `avatars`, `user-avatars` (Supabase bucket), `spin` (shared spin rules) |
| `data/` | Generated JSON: `trending-leads.json`, `sticker-descriptions.json`, `wallpaper-descriptions.json` |

### `crawler/`

| Path | What it does |
|---|---|
| `anime-sync.mjs`, `jikan-crawler.mjs`, `anime-cast-crawler.mjs` | Anime catalog (AniList, then Kitsu, then Jikan) and cast lists |
| `tmdb-crawler.mjs`, `watch-providers-crawler.mjs` | Movie catalog and where-to-watch data |
| `characters-sync.mjs` | Character profiles into `anime_characters`; `--ai` writes fact-based overviews |
| `trending-leads.mjs` | Builds `lib/data/trending-leads.json` |
| `ending-explained-generator.mjs` | Writes Ending Explained guides with Gemini, grounded on catalog and Wikipedia data |
| `watch-order-auto.mjs`, `franchise-watch-order-builder.mjs`, `franchise-defs.json` | Watch Order guides (discovered, and hand-kept groups) |
| `gif-captions-backfill.mjs` | Pre-generates a caption for every sticker without one |
| `indexnow-bulk.mjs` | Submits sitemap URLs to IndexNow |
| `upload-original-gifs.mjs` | Uploads a local folder to the `original-gifs` bucket |
| `migrate.mjs`, `migrate-title-requests.mjs` | Apply `db/schema.sql` or the title-requests migration |
| `db.mjs` | Database helpers for crawlers |
| `lib/` | `ai` (Gemini with model fallback), `prompts`, `quality`, `retry`, `slug`, `wikipedia`, `indexnow` |
| `sources/` | `anilist`, `kitsu`, `jikan` API clients |
| `test/quality.test.mjs` | Tests for generated-guide validation |

### `scripts/`

| Path | What it does |
|---|---|
| `warm-cache.mjs` | Fetches every sitemap URL once so pages are cached before crawlers arrive |
| `seo-audit.mjs` | Playwright SEO audit of a local or live site |
| `describe-stickers.mjs` | Writes alt text and a description for each sticker from the image (Gemini vision) into `lib/data/sticker-descriptions.json` |
| `describe-wallpapers.mjs` | Same for wallpapers into `lib/data/wallpaper-descriptions.json` |

### `db/`

| Path | What it does |
|---|---|
| `schema.sql` | Full schema: `anime`, `movies`, `franchises`, `franchise_entries`, `comments`, `title_requests`, `sync_state`, `device_tokens`, `gif_captions` |
| `migrations/20260929_title_requests.sql` | Title request queue |
| `migrations/20261110_anime_characters.sql` | Character profiles table |

---

## Quick start

```bash
npm install
cp .env.example .env.local     # set DATABASE_URL at minimum
npm run db:migrate             # applies db/schema.sql
npm run crawl:all:full         # first catalog load (needs TMDB_API_READ_ACCESS_TOKEN)
npm run dev                    # http://localhost:3000
```

Content pages stay empty until the crawlers and generators have filled
Postgres. The sticker maker, wallpapers and games work without a database.

## npm scripts

| Script | Purpose |
|---|---|
| `dev`, `build`, `start`, `lint` | Standard Next.js |
| `db:migrate`, `db:migrate:title-requests` | Apply the full schema, or only the title-requests table |
| `crawl:anime` (`:full`, `:jikan-only`), `crawl:movies` (`:full`), `crawl:watch-providers`, `crawl:anime-cast` | Catalog crawlers |
| `crawl:all`, `crawl:all:full` | All catalog crawlers in sequence |
| `crawl:characters` | Character profiles (`-- --ai` / `-- --ai-only` for overviews) |
| `generate:leads` | Trending female leads JSON |
| `generate:ending-explained` (`:movies`, `:anime`) | Ending Explained guides |
| `generate:watch-order`, `build:watch-order` | Watch Order guides |
| `generate:gif-captions` | Pre-generate sticker captions |
| `indexnow:all` | Submit all sitemap URLs to IndexNow |
| `warm-cache` | Warm the ISR cache (runs automatically after deploys) |
| `seo:audit` | SEO audit |
| `upload:original-gifs` | Upload stickers to Supabase Storage |
| `test:crawler` | Crawler quality tests |

## Configuration

Every environment variable is documented in [`.env.example`](.env.example).
Only `DATABASE_URL` is required to run the site; every other key turns on an
optional feature. On Vercel, use the Supabase **transaction pooler (port
6543)** for `DATABASE_URL` ([docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

## Documentation

| Doc | Covers |
|---|---|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel, database, domain, stickers in Supabase Storage, cache warming, IndexNow, admin |
| [docs/CRAWLERS.md](docs/CRAWLERS.md) | Crawlers, AI generators, schedule, secrets |
| [docs/SEO.md](docs/SEO.md) | Indexing setup, the November 2026 audit, fixes, and what needs Search Console |
| [docs/STICKER_MAKER.md](docs/STICKER_MAKER.md) | The sticker maker and the optional on-device Anime AI cut-out |
| [docs/MOBILE.md](docs/MOBILE.md) | Android app, push notifications, releases |
| [SECURITY.md](SECURITY.md) | What is locked down and what to check |
