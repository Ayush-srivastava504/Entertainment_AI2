# SEO: how the site is set up, what was fixed, and how to keep it healthy

This is the reference for everything search-related on animegirl4u.com: how
pages get crawled and indexed, the audit done in November 2026, the root
causes found, what was changed in the code, and the jobs that still need a
person (Vercel and Google Search Console).

Google decides what it indexes. Everything here removes technical reasons
for a page to be left out; none of it guarantees indexing.

---

## 1. How indexing works on this site

| Piece | Where | What it does |
|---|---|---|
| Sitemap index | `app/sitemap.xml/route.ts` -> `lib/sitemap.ts` (`buildSitemapIndex`) | Lists one child sitemap per section so Search Console reports indexing per section. |
| Child sitemaps | `app/sitemaps/[name]/route.ts` -> `buildSitemapByName` | `pages.xml` (hubs, wallpapers, stickers, GIFs, characters, topics, sticker maker), `watch-order.xml`, `anime-N.xml` and `movies-N.xml` (1,000 URLs each). Only `<loc>` and a real `<lastmod>`. |
| robots.txt | `app/robots.ts` | Allows everything except `/api/` (but allows `/api/og` so share images work), `/admin`, `/favorites`, `/search`. Lists the index and every child sitemap. |
| Canonicals | each page's `generateMetadata` / `metadata` (`alternates.canonical`) | Always self-referencing, absolute, non-www. The root layout deliberately sets no canonical. Exception: the homepage renders `<link rel="canonical" href="https://animegirl4u.com/">` itself in `app/page.tsx`, because Next.js strips the trailing slash from a root canonical and Search Console then flagged `/` as "Alternate page with proper canonical tag". |
| noindex | per page (`robots: { index: false, follow: true }`) | Only for pages that should not rank: internal search results, filtered or parameter views, thin fallbacks, the games section. Never used to hide a fixable problem. |
| Structured data | `lib/jsonld.ts` + each page | Organization and WebSite on every page; BreadcrumbList, CollectionPage, Article, ProfilePage, ImageObject, ImageGallery, FAQPage, WebApplication where relevant. |
| Share cards | `lib/og.ts` (`socialMeta`) + `app/api/og` | og:title, og:description, og:url, og:image and twitter:card for every page. |
| Bot-safe metadata | `next.config.js` `htmlLimitedBots` | Googlebot, Bingbot and link-preview bots get metadata in `<head>` instead of streamed. |
| IndexNow | `lib/indexnow.ts`, `crawler/indexnow-bulk.mjs` | Pushes new and changed URLs to Bing and friends. |
| www redirect | `next.config.js` `redirects()` | `www.animegirl4u.com/*` -> `animegirl4u.com/*` (permanent). Should also be set to 308 in Vercel; see section 5. |

### Which URLs are indexable

| Section | Indexable | Notes |
|---|---|---|
| Ending Explained guides (anime and movies) | yes | Movies were held back from the sitemap at launch; they are now included (`INCLUDE_MOVIES = true` in `lib/sitemap.ts`). |
| Watch Order guides, topic hubs | yes | Topic hubs are only listed once enough guides exist. |
| Character profiles (`/anime-characters/[slug]`) | yes, unless `noindex = true` in `anime_characters` | Live Jikan fallback profiles are always noindex. |
| Wallpapers, sticker collections, `/gif/[id]` | yes | Each has its own description written from the image. |
| `/stickers/maker` | yes | `?src=` variants (preloaded sticker) are noindex. |
| `/games/*`, `/favorites`, `/search` | no | Deliberate. |
| `/ending-explained?type=...`, `/anime-characters?q=` or `?page=2+`, `/stickers?q=` | no (noindex, follow) | Filter, search and live-API listing views. |

---

## 2. The November 2026 audit

A full crawl of every sitemap URL (1,250 at the time, 1,843 after movies were
added) was run against the live site with a Googlebot user agent, before and
after the fixes. It checked status codes, redirects, canonicals, robots,
titles, descriptions, H1s and heading order, OG/Twitter tags, `lang`, JSON-LD
validity, image `alt` and dimensions, word count, near-duplicate content
(5-word shingles, Jaccard similarity over 0.6), inbound internal links, click
depth from the homepage and response time.

### Root causes found

**"Discovered - currently not indexed" (Google slowing its crawl):**

1. **HTTP 500s under parallel load.** `DATABASE_URL` used Supabase's
   *session* pooler (port 5432), which caps concurrent clients. A crawler
   requesting many uncached pages at once exhausted it: 48 of 1,250 pages
   returned 500 in one crawl. Google lowers its crawl rate for a host that
   errors.
2. **Every deploy empties the ISR cache.** Dynamic pages use
   `generateStaticParams() { return [] }`, so after a deploy all ~1,250 pages
   render cold (1-4 s each, each hitting Postgres).
3. **GIF pages hung for 8 s.** The default Gemini model `gemini-3.8-flash`
   does not exist; the API does not error, it hangs. Every cold `/gif` render
   waited the full timeout and shipped without its caption.
4. **Deep pages.** Pagination showed only `1 ... page+-2 ... last`, so guides
   on middle hub pages were up to 32 clicks from the homepage.

**"Crawled - currently not indexed" (thin or duplicate pages):**

5. **Wallpaper pages were ~90% identical text** (only the number changed).
6. **GIF pages had ~20 words**, and sticker collection pages ~80.
7. **5 character profiles had no content at all** (no bio in the source).

### Before and after

| Check | Before | After |
|---|---|---|
| HTTP 500 under cold, parallel crawl | 48 | 0 |
| Pages missing lang / OG / Twitter tags | 48 (the 500 pages) | 0 |
| GIF pages missing og:url | 160 | 0 |
| GIF images without width/height | 1,260 | 0 |
| Maximum click depth | 32 | 6 |
| Sitemap pages with no inbound link | 10 | 0 |
| Near-duplicate wallpaper pairs | 372 | 0 |
| Near-duplicate GIF pairs | 20 (most too thin to measure) | 0 |
| Words on a sticker collection page | ~80 | ~500 |
| Words on a GIF page | ~23 | ~81 |
| Movie guides in the sitemap | 0 | ~600 |
| Canonical or noindex conflicts | 0 | 0 |

---

## 3. What was changed, file by file

| Change | Files |
|---|---|
| Pool: idle-error handler (an unhandled pool error crashed the instance), timeouts, one retry on transient connection errors | `lib/db.ts` |
| Recommend the transaction pooler (port 6543) | `.env.example` |
| Refill the ISR cache after every production deploy | `scripts/warm-cache.mjs`, `.github/workflows/warm-cache.yml`, `npm run warm-cache` |
| Jump links to every 5th page in pagination | `components/ui/Pagination.tsx` |
| Working Gemini default (`gemini-3.5-flash-lite`, `reasoning_effort: "low"`, 5 s timeout) | `lib/api/gif-captions.ts`, `crawler/lib/ai.mjs` |
| Pre-generate GIF captions instead of at request time | `crawler/gif-captions-backfill.mjs`, `npm run generate:gif-captions` |
| Per-wallpaper alt text and description written from the actual image | `scripts/describe-wallpapers.mjs` -> `lib/data/wallpaper-descriptions.json`, merged in `lib/wallpapers.ts`, shown in `app/wallpapers/[slug]/page.tsx` |
| Per-sticker alt text and description written from the actual image | `scripts/describe-stickers.mjs` -> `lib/data/sticker-descriptions.json`, merged in `lib/api/original-gifs.ts`, shown on `/gif/[id]` and in the "What's in the collection" list on `/stickers/[collection]` |
| GIF pages: full social tags, image dimensions, per-item facts; removed a wrong "480 x 480" size row | `app/gif/[id]/page.tsx` |
| Catch-all "Reactions" sticker collection for stickers with no series prefix (they had no hub page) | `lib/sticker-collections.ts` |
| Trending-lead prev/next link straight to the final profile URL (no redirect hop) | `app/anime-characters/leads/[slug]/page.tsx` |
| CollectionPage + BreadcrumbList on the characters hub | `app/anime-characters/page.tsx` |
| noindex, follow on search and parameter variants | `app/anime-characters/page.tsx`, `app/stickers/page.tsx`, `app/stickers/maker/page.tsx` |
| Movie guides added to the sitemap | `lib/sitemap.ts` (`INCLUDE_MOVIES`) |
| 5 empty character profiles set to `noindex = true` (database, not code) | `anime_characters` rows: shinpei-goto, lily-flambert, pia-rockwell, karen-so-whats-wrong-with-getting, sonarue-maywood |

---

## 4. Scripts for SEO work

| Command | What it does | When to run |
|---|---|---|
| `npm run warm-cache` | Fetches every sitemap URL once at low concurrency (3) so pages are cached before crawlers arrive. `--base=` and `--concurrency=` flags. Exits non-zero if any URL returns 5xx. | Runs automatically after each production deploy (workflow). Run by hand after a manual redeploy. |
| `npm run seo:audit` | Playwright pre-flight audit (status, canonicals, robots, metadata, JSON-LD, thin content, broken links, orphans). See the header of `scripts/seo-audit.mjs` for flags. | Before big releases. |
| `npm run generate:gif-captions` | Writes a Gemini caption for every original sticker that lacks one (`gif_captions` table). Needs `DATABASE_URL`, `GEMINI_API_KEY`, Supabase keys. `--dry-run`, `--limit=N`. | After uploading new stickers. |
| `node --env-file=.env scripts/describe-stickers.mjs` | Writes alt + description for new stickers into `lib/data/sticker-descriptions.json` using Gemini vision. `--force` regenerates all. Review the JSON, then commit. | After uploading new stickers. |
| `node --env-file=.env scripts/describe-wallpapers.mjs` | Same for wallpapers in `public/wallpapers`. | After adding wallpapers. |
| `npm run indexnow:all` | Submits sitemap URLs to IndexNow. | After large content changes. |

---

## 5. Needs a person (not in code)

1. **Vercel -> Settings -> Environment Variables:** `DATABASE_URL` should use
   the Supabase **transaction pooler, port 6543**. Keep the GitHub Actions
   secret on the session pooler (5432); the crawlers are long-running single
   processes and need IPv4.
2. **Vercel -> Settings -> Domains:** set the `www.animegirl4u.com` redirect to
   **308 Permanent** (it was a 307 temporary redirect).
3. **Google Search Console:** resubmit `sitemap.xml` after big changes, use
   **Validate fix** on "Crawled - currently not indexed", watch
   Settings -> Crawl stats -> host status for server errors.
4. **Character profiles:** to bring one of the 5 noindexed profiles back, add a
   bio (`about` or `overview`) and set `noindex = false`.

---

## 6. Keeping it healthy

- New page type? Give it a self-referencing canonical, one H1, `socialMeta`,
  JSON-LD with a breadcrumb, and add it to `lib/sitemap.ts` if it should rank.
- Parameter views of an indexable page (filters, search, preloaded tools):
  canonical to the clean URL and `noindex, follow`.
- Don't generate request-time content that calls a slow external service;
  pre-generate it with a script and read it from the database or a JSON file.
- After adding images (stickers, wallpapers), run the describe scripts so the
  new pages are not near-duplicates.
