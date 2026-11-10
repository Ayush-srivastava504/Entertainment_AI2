# Security

This is a summary of what's already locked down in this codebase, and what
to double-check yourself before going live. Nothing here replaces a real
professional audit for a production business.

## What's already in place

**Database access**
- Queries in `lib/` and `crawler/*.mjs` use parameterized placeholders
  (`$1`, `$2`, ...). Do not concatenate user input into SQL. Any table name
  that is interpolated must come from a fixed union in code, never a raw string.
- `DATABASE_URL` is only read on the server and crawler scripts and is never
  prefixed `NEXT_PUBLIC_`, so it cannot reach the browser bundle.

**Secrets**
- `.env` and `.env.*` are gitignored (only `.env.example` is tracked).
- Server-only: `DATABASE_URL`, `REVALIDATION_SECRET`, `ADMIN_PASSWORD`,
  `ADMIN_SESSION_SECRET`, `TMDB_API_READ_ACCESS_TOKEN`, `GEMINI_API_KEY`,
  `INDEXNOW_KEY` (also served as a public key file by design).
- Exposed to the client by design: `NEXT_PUBLIC_SITE_URL`,
  `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe only while the `original-gifs` bucket
  is read-only public).
- `/api/revalidate` compares the secret in constant time
  (`timingSafeEqual`) and refuses to run when `REVALIDATION_SECRET` is unset.

**Admin panel**
- `/admin` and `/api/admin/*` require a signed session cookie (HMAC-SHA256,
  `ADMIN_SESSION_SECRET`) issued after a password check against
  `ADMIN_PASSWORD`. `middleware.ts` enforces this on every request. It is a
  single shared password, not per-user accounts, and login is rate limited.
- Admin routes are blocked for the Android app user agent (convenience only).

**Input validation and rate limiting**
- Public write endpoints (`/api/comments`, `/api/like`, `/api/title-requests`,
  `/api/favorites`, `/api/push/register`) validate input (enums, length caps,
  JSON parse errors) and the first three rate limit per IP.
- User-submitted text is rendered through React's escaping. The only
  `dangerouslySetInnerHTML` use is JSON-LD built from trusted data, with `<`
  escaped to `<`.

**HTTP security headers** (`next.config.js`)
- `X-Frame-Options: DENY` — blocks clickjacking via iframe embedding.
- `X-Content-Type-Options: nosniff` — blocks MIME-sniffing attacks.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy` — disables camera/mic/geolocation (unused features).
- `Strict-Transport-Security` — forces HTTPS on repeat visits.

**Infrastructure**
- Hosting is Vercel plus managed Postgres; there is no self-managed server
  to patch.

**Sticker maker** (`/stickers/maker`, see docs/STICKER_MAKER.md)
- All image processing happens in the visitor's browser; no image is
  uploaded and there is no server endpoint for it.
- `?src=` only accepts the id of one of this site's own stickers. The server
  resolves it with `getGifById`, so the page can never be made to load an
  arbitrary URL.
- The optional Anime AI cut-out loads third-party code and data only after
  the visitor opts in: onnxruntime-web (exact version `1.20.1`) from
  `cdn.jsdelivr.net` and the model from `huggingface.co`. Both are pinned
  URLs, but they are not covered by Subresource Integrity (a native dynamic
  `import()` cannot carry an integrity hash). Keep `ORT_VERSION` pinned to an
  exact version in `lib/anime-cutout.ts`.

## What to double-check yourself

- **Rate limiting is per server instance, in memory.** On Vercel, each
  serverless invocation may be a fresh instance, so this is a soft
  deterrent, not a hard guarantee. If abuse becomes a real problem, swap
  the `hits` Map pattern in `/api/comments`, `/api/like`, `/api/title-requests` for
  Upstash Redis or Vercel's rate-limiting middleware.
- **No visitor accounts** (comments, likes, title requests): anyone can
  post. Confirm that is intended; comments and likes are where to add auth.
- **Content moderation for comments** isn't automated. There's length
  limits and rate limiting, but nothing screens for spam/abuse content
  itself. Consider adding a moderation queue or a service like Akismet if
  the comment sections get real traffic.
- **CSP (Content-Security-Policy)** isn't set. It wasn't added by default
  because a strict policy needs to be tuned against exactly which image
  hosts (TMDB, AniList/Kitsu posters) and font/script sources you use, and
  a wrong policy silently breaks the UI. A reasonable starting point once
  you've deployed and can test against it:
  ```
  default-src 'self';
  img-src 'self' https://image.tmdb.org https://*.myanimelist.net https://*.supabase.co data: blob:;
  script-src 'self' https://cdn.jsdelivr.net 'wasm-unsafe-eval';
  connect-src 'self' https://*.supabase.co https://cdn.jsdelivr.net https://huggingface.co https://*.hf.co;
  style-src 'self' 'unsafe-inline';
  ```
  The jsDelivr, Hugging Face, `blob:` and `wasm-unsafe-eval` entries are
  needed by the sticker maker's optional AI (the engine is WebAssembly and
  the downloaded files are fetched from those hosts). Note that
  `lib/anime-cutout.ts` builds its dynamic import with `new Function`, which a
  CSP without `'unsafe-eval'` blocks; if you add a CSP, switch that to a plain
  `import(/* webpackIgnore: true */ url)` and test it.
  Add it as another entry in the `headers()` array in `next.config.js`.
- **Dependency updates**: run `npm audit` periodically — nothing here
  pins package versions against known CVEs on your behalf.
