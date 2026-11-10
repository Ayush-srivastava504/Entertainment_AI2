# Deployment and operations

## Database

1. Create a Postgres database (Neon or Supabase).
2. Apply the schema with `npm run db:migrate`. `db/schema.sql` is idempotent and safe to re-run.
3. For an existing database that only lacks the request queue, run `npm run db:migrate:title-requests`.

Tables: `anime`, `movies`, `franchises`, `franchise_entries`, `comments`,
`title_requests`, `sync_state`, `device_tokens`, `gif_captions`, and
`anime_characters` (from `db/migrations/20261110_anime_characters.sql`).

### Connection string: use the transaction pooler on Vercel

On Vercel, set `DATABASE_URL` to Supabase's **transaction pooler (port
6543)**, not the session pooler (5432). Session mode holds one server
connection per client and caps how many clients can connect; when a crawler
requests many uncached pages at once, serverless instances exhaust it and
pages return HTTP 500, which makes Google slow its crawling. The app uses no
session-only features (no named prepared statements, `LISTEN` or session
`SET`), so transaction mode is safe. `lib/db.ts` also retries a query once on
transient connection errors.

GitHub Actions should keep the session pooler (5432): see docs/CRAWLERS.md.

## Vercel

1. Import the repo into Vercel.
2. Set environment variables from `.env.example`. Required: `DATABASE_URL`,
   `NEXT_PUBLIC_SITE_URL`, `REVALIDATION_SECRET`. For the admin panel:
   `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` (`openssl rand -hex 32`).
3. Optional: `UPSTASH_REDIS_REST_URL`/`_TOKEN` (shared cache across instances),
   `GEMINI_API_KEY` (GIF captions),
   `NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY`, `INDEXNOW_KEY`,
   `ANDROID_SHA256_CERT_FINGERPRINTS`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`.

Stickers and GIFs come only from your own originals in Supabase Storage (no
third-party GIF APIs). Without `GEMINI_API_KEY`, GIFs still work and only the
captions are skipped.

## Custom domain

Add the domain in Vercel, point DNS at Vercel, then set `NEXT_PUBLIC_SITE_URL`.
In Vercel -> Settings -> Domains, set the `www` domain to redirect to the apex
with **308 Permanent**. (A 307 tells Google the move is temporary.)
`lib/site.ts` always canonicalizes to the non-www origin, and `next.config.js`
redirects `www.animegirl4u.com`. If the domain changes, also update that
redirect, the hard-coded URL in `.github/workflows/crawl.yml`, and
`mobile/capacitor.config.json`.

## Original GIFs (Supabase Storage)

Original GIFs are not stored in git. They are served from a public Supabase
bucket named `original-gifs`.

1. In Supabase: Storage, New bucket, name it `original-gifs`, turn **Public bucket** on.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Upload files named with dashes, e.g. `shy-wave-hello.gif` (shown as "Shy Wave Hello"), through the dashboard or `npm run upload:original-gifs`.

New uploads appear within about 5 minutes on the homepage and `/stickers`, each
with its own `/gif/original-<filename>` page and a cached Gemini caption.

## Cache warming after deploys

Every deploy starts with an empty ISR cache. `.github/workflows/warm-cache.yml`
listens for Vercel's `deployment_status` event and, after a successful
**Production** deploy, runs `node scripts/warm-cache.mjs` to fetch every
sitemap URL once (3 at a time), so crawlers get cached pages. It needs no
secrets. Run it by hand from the Actions tab, or locally with
`npm run warm-cache`.

## Sticker captions and descriptions

After uploading new stickers:

1. `npm run generate:gif-captions` (pre-generates captions; needs
   `DATABASE_URL`, `GEMINI_API_KEY` and the Supabase keys).
2. `node --env-file=.env scripts/describe-stickers.mjs`, review
   `lib/data/sticker-descriptions.json`, commit and deploy.

Stickers whose filename matches no collection prefix land in the "Reactions"
collection (`lib/sticker-collections.ts`).

## Sticker maker

`/stickers/maker` needs no configuration. It runs in the browser. The
optional Anime AI cut-out downloads its model from Hugging Face and its engine
from jsDelivr, only when a visitor opts in. See docs/STICKER_MAKER.md.

## Revalidation

`POST /api/revalidate` with `REVALIDATION_SECRET` clears cached paths on demand.

## IndexNow

Set `INDEXNOW_KEY` (random, 8 to 128 alphanumeric characters) on Vercel and in
GitHub secrets. The key file is served at `/<key>.txt`. The crawlers ping
IndexNow after changes, and `npm run indexnow:all` submits everything.

## Admin panel

`/admin` is a single-password panel (`ADMIN_PASSWORD`) protected by a signed
session cookie and `middleware.ts`. It manages titles, comments and title
requests, and is blocked inside the Android app.

### Stickers not showing from Supabase Storage

A public bucket only makes direct file URLs public; *listing* files still needs
access. Either set `SUPABASE_SERVICE_ROLE_KEY` in Vercel (server-only, used
first), or run this once in the Supabase SQL editor to let the anon key list:

```sql
create policy "Public list original-gifs"
on storage.objects for select to anon
using (bucket_id = 'original-gifs');
```
