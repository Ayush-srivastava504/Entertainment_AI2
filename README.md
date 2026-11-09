# Animegirl4u

Next.js 16 (App Router, TypeScript, Tailwind) site for anime and movie guides,
deployed on Vercel. Live at <https://animegirl4u.com>.

Postgres is the single source of truth for catalog content. Pages read the
database; nothing calls TMDB, AniList or Jikan at request time. The only
request-time external calls are GIF/sticker search (Tenor, Giphy), original
GIFs (Supabase Storage) and per-GIF captions (Gemini, cached in Postgres).

```
GitHub Actions (crawl.yml)  ->  crawlers + AI generators  ->  Postgres
Vercel (Next.js)            <-  reads Postgres, Upstash Redis (optional cache)
Android app (mobile/)       ->  Capacitor shell that loads the live site
```

## What's on the site

| Area | Routes |
|---|---|
| Ending Explained guides | `/ending-explained`, `/ending-explained/[slug]`, `/ending-explained/topic/[topic]` |
| Watch Order guides | `/watch-order`, `/watch-order/[franchise]`, `/watch-order/topic/[topic]` |
| Legacy catalog URLs (redirect to guides) | `/movies`, `/anime`, `/genres`, `/rankings` |
| GIFs, stickers, wallpapers | `/stickers`, `/gif/[id]`, `/wallpapers`, `/wallpapers/[slug]` |
| Games | `/games` (spin, memory, match3, tetris) |
| Search, favorites, requests | `/search`, `/favorites`, title requests on the homepage |
| Admin (password protected) | `/admin` (titles, comments, title requests) |
| SEO and infra | `/sitemap.xml`, `/sitemaps/[name]`, `/robots.txt`, `/<INDEXNOW_KEY>.txt`, `/api/revalidate`, `/.well-known/assetlinks.json` |

A title only gets a public URL once its guide content has been generated.
`movies` and `anime` are source tables, not public pages.

## Repository layout

```
app/          Next.js routes, API routes, metadata (sitemap, manifest, OG images)
components/   React components (ui/, media/, admin/, games/, topics/, wallpapers/)
lib/          Server helpers: db, cache, SEO/JSON-LD, sitemaps, admin auth, api/ data access, games/
crawler/      Node scripts run by GitHub Actions or by hand (see docs/CRAWLERS.md)
db/           schema.sql (idempotent) and one-off migrations
mobile/       Capacitor Android wrapper (see docs/MOBILE.md)
public/       Static assets (hero GIFs, wallpapers, game art, icons)
docs/         Extra documentation
```

## Quick start

```bash
npm install
cp .env.example .env.local     # set DATABASE_URL at minimum
npm run db:migrate             # applies db/schema.sql
npm run crawl:all:full         # first catalog load (needs TMDB_API_READ_ACCESS_TOKEN)
npm run dev                    # http://localhost:3000
```

Content pages stay empty until the crawlers and generators have populated Postgres.

## Scripts

| Script | Purpose |
|---|---|
| `dev`, `build`, `start`, `lint` | Standard Next.js |
| `db:migrate`, `db:migrate:title-requests` | Apply the full schema, or only the title-requests table |
| `crawl:all` / `crawl:all:full` | Anime, movies, watch providers, anime cast (incremental / full) |
| `generate:ending-explained` (`:movies`, `:anime`) | Write Ending Explained guides with Gemini |
| `generate:watch-order`, `build:watch-order` | Discover franchises / build from `franchise-defs.json` |
| `indexnow:all` | Submit all sitemap URLs to IndexNow |
| `upload:original-gifs` | Upload local GIFs to Supabase Storage |
| `test:crawler` | Crawler quality tests |

Details are in [docs/CRAWLERS.md](docs/CRAWLERS.md).

## Configuration

All environment variables are documented in [`.env.example`](.env.example).
Only `DATABASE_URL` is required to run the site; every other key enables an
optional feature.

## More documentation

- [docs/CRAWLERS.md](docs/CRAWLERS.md): crawlers, generators, schedule, secrets
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): Vercel, domain, GIFs, IndexNow, admin
- [docs/MOBILE.md](docs/MOBILE.md): Android app, Firebase push, release secrets
- [SECURITY.md](SECURITY.md): what is locked down and what to check
