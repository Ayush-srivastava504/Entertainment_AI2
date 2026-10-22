# HANDOFF after Session 3 (analytics & push)

Paste this file at the start of the next session. Supersedes the Session 2 handoff.

## Project
Marquee (https://marquees.site): Next.js 16 / Postgres / Vercel site. Android app lives in `mobile/`
(Capacitor 8, appId `site.marquees.app`), loads the live site. Brand: blue #2A3FF0, yellow #FFD84A.
GA4 id G-ZEZ5BF0QF4 (helper: lib/analytics.ts `trackEvent`).

## ⚠️ Blocking step — only you can do this, before any of this works
Session 3 wires the app up to receive push and to apply/report a `google-services.json`, but it
**cannot create the Firebase project itself** — that needs your Google account in a browser:

1. https://console.firebase.google.com → Add project (any name, e.g. "Marquee").
2. Inside it: Add app → Android → package name `site.marquees.app` (must match exactly).
3. Download the generated `google-services.json` and put it at `mobile/android/app/google-services.json`
   (same folder as `build.gradle` — already git-ignored? if not, add it; it has no secret in it that
   matters more than your Android SDK key restrictions, but keep it out of a public repo to be safe).
4. In the **project root** `mobile/android/build.gradle` (not the app-level one — this file wasn't in
   scope for this session's zip, so this one edit is manual), add the Google services classpath:
   ```gradle
   buildscript {
       dependencies {
           // ...existing classpath lines...
           classpath 'com.google.gms:google-services:4.4.2'
       }
   }
   ```
   `mobile/android/app/build.gradle` already has the matching `apply plugin: 'com.google.gms.google-services'`
   block (added in an earlier session) — it only activates once `google-services.json` exists, so until
   step 3 is done the build behaves exactly as before.
5. Run `npm run sync` (or `npx cap sync android`) inside `mobile/` after `npm install` picks up the new
   `@capacitor/push-notifications` dependency.

Everything below assumes steps 1–4 are done. Firebase Analytics (the native SDK) also comes along for
free once `google-services.json` is in place — no extra wiring needed for basic app-open/screen tracking,
though this session focused on GA4 events (via the existing web `trackEvent`) and push, not native
Firebase Analytics events specifically.

## Session 3 (done): analytics & push
Native (`mobile/android/app/src/main/...`):
- `AndroidManifest.xml`: added `POST_NOTIFICATIONS` permission (Android 13+) and two `<meta-data>` entries
  pointing FCM at a default notification channel + icon.
- `res/values/push_notifications.xml` (new): defines `default_notification_channel_id` = `marquee_default`.
- `MainActivity.java`: added `createDefaultPushChannel()`, called from `onCreate()` before the existing
  back-handler/pull-to-refresh setup, so the channel exists natively even if a push arrives before any JS
  has run. (Capacitor's docs warn that without this, FCM silently falls back to its own default channel.)
- `mobile/package.json`: added `@capacitor/push-notifications` (`^8.0.0`).
- No other native code needed — the plugin injects `window.Capacitor.Plugins.PushNotifications` into the
  page, same mechanism as `Share` from Session 2, so registration/permissions/token/tap-handling all live
  in `components/AppBridge.tsx` (site side) rather than Java.

Site (apply `site-patches/session3-site.patch` + copy/replace the 2 files below):
- `components/AppBridge.tsx` (full file replace, not a patch — too many changes to patch cleanly): kept
  the Session 2 share bridge, added `installPushBridge()`:
  - `checkPermissions()` → `requestPermissions()` if `prompt` → `register()` if granted.
  - `registration` listener posts the FCM token to `/api/push/register`.
  - `pushNotificationActionPerformed` listener navigates `window.location.href` to the notification's
    `data.link` field, if present (no native deep-link code needed — it's just the page navigating itself).
  - Fires GA4 events: `app_open` (on every app launch), `push_token_registered`, `push_permission_denied`,
    `push_notification_received`, `push_notification_opened`.
- `app/api/push/register/route.ts` (new file): validates and upserts `{token, platform}` into a
  `device_tokens` table. **Written against an assumed `query(sql, params)` export from `@/lib/db`** — I
  don't have that file in this session's context, only prior sessions' diffs. If the project's actual
  Postgres helper has a different name/shape, update the import + the one `query(...)` call; nothing else
  in the route depends on it.
- `lib/analytics.ts` patch: adds `app_open`, `push_token_registered`, `push_permission_denied`,
  `push_notification_received`, `push_notification_opened` to the `AnalyticsEvent` union (same slot where
  Session 2 added `share`).
- `schema.sql` — **not patched (I don't have this file either)**. Add a table before first use:
  ```sql
  create table if not exists device_tokens (
    token text primary key,
    platform text not null default 'android',
    created_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now()
  );
  ```

## Sending a push (manual, for now)
No send-side UI yet — that's Session 3b or later. Until then, send a test push from the Firebase Console
(Cloud Messaging → New campaign) targeting the app, or via the FCM HTTP v1 API using a service-account key
and the tokens in `device_tokens`. Put a `link` field in the notification's **data** payload (not just
title/body) if you want tapping it to open a specific page — the app reads `data.link`.

## Verified here
- Site: both new/changed TS files (`components/AppBridge.tsx`, `app/api/push/register/route.ts`) pass a
  standalone `tsc --noEmit` syntax check (module-resolution errors for the project's own files ignored,
  since this sandbox doesn't have the full repo).
- Android: `AndroidManifest.xml` and the new `push_notifications.xml` are well-formed XML;
  `MainActivity.java` is brace/paren-balanced; `package.json` is valid JSON.

## NOT verified (same constraint as every session so far — no JDK/Android SDK here)
- `MainActivity.java`'s new `createDefaultPushChannel()` has never been compiled against the real
  `R.string.default_notification_channel_id` — this only resolves once Gradle generates `R` from the new
  `push_notifications.xml`, which needs a real build.
- Push has never been round-tripped end to end (device → FCM → device). First real test happens after
  you've done the blocking Firebase steps above, built, installed, and sent yourself a test push.
- `/api/push/register`'s `@/lib/db` import is a guess at the project's convention (see note above) and
  will fail to compile if wrong — check this first if the build breaks here.

## Phone test checklist (adds to Session 2's list)
1. Fresh install, open app → Android 13+ shows the notification permission prompt once.
2. Allow it → within a few seconds a row appears in `device_tokens` (check via psql or your DB UI).
3. Deny it → no row is added; `push_permission_denied` fires in GA4 (check Realtime in GA4, event
   `push_permission_denied`, param `method=user_declined`).
4. Send a test push (Firebase Console, app in foreground) → notification doesn't show by default in
   foreground unless you also set presentationOptions — expected for now; check GA4 `push_notification_received`.
5. Background the app, send a test push with a `data.link` → tap the system notification → app opens
   directly to that URL.
6. Kill the app fully, send a push → tap it → app cold-starts to the linked URL (same path as Session 2's
   deep-link cold-start handling in `onNewIntent`/`MainActivity.load()`).

## Deferred / known gaps
- Sending campaigns from inside the app's own admin panel (vs. the Firebase Console by hand): Session 3b.
- Foreground notification display behavior (`presentationOptions`) not configured — currently default
  (Android shows nothing special in foreground beyond the `pushNotificationReceived` JS event firing).
- Data-only / silent notifications while the app is fully killed need a custom `FirebaseMessagingService`
  — out of scope here, flagged in Capacitor's own docs as a gap in the plugin.
- No unsubscribe/token-cleanup job yet (stale `device_tokens` rows from uninstalls just accumulate;
  FCM returns an "unregistered" error on send for these — worth pruning on that signal eventually).
- In-app review prompt: Session 5 (unchanged from Session 2's handoff).
- Privacy policy / account-deletion page (Play requires a public URL): Session 4 (unchanged).

## GitHub secrets (unchanged)
ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD

## Apply to repo (from repo root)
```
unzip -o marquee-android-session3.zip
git apply site-patches/session3-site.patch        # Session 1 + 2 patches must already be applied
# then manually replace/add:
#   components/AppBridge.tsx        (full replace)
#   app/api/push/register/route.ts  (new)
# and copy the mobile/ files over their existing counterparts.
```
