# Deployment and operations

## Database

1. Create a Postgres database (Neon or Supabase).
2. Apply the schema with `npm run db:migrate`. `db/schema.sql` is idempotent and safe to re-run.
3. For an existing database that only lacks the request queue, run `npm run db:migrate:title-requests`.

Tables: `anime`, `movies`, `franchises`, `franchise_entries`, `comments`,
`title_requests`, `sync_state`, `device_tokens`, `gif_captions`.

## Vercel

1. Import the repo into Vercel.
2. Set environment variables from `.env.example`. Required: `DATABASE_URL`,
   `NEXT_PUBLIC_SITE_URL`, `REVALIDATION_SECRET`. For the admin panel:
   `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` (`openssl rand -hex 32`).
3. Optional: `UPSTASH_REDIS_REST_URL`/`_TOKEN` (shared cache across instances),
   `TENOR_API_KEY`, `GIPHY_API_KEY`, `GEMINI_API_KEY` (GIF captions),
   `NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY`, `INDEXNOW_KEY`,
   `ANDROID_SHA256_CERT_FINGERPRINTS`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`.

Without the Tenor/Giphy keys the sticker sections render empty. Without
`GEMINI_API_KEY`, GIFs still work and only the captions are skipped.

## Custom domain

Add the domain in Vercel, point DNS at Vercel, then set `NEXT_PUBLIC_SITE_URL`.
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
Originals rank ahead of Tenor and Giphy results in search.

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
