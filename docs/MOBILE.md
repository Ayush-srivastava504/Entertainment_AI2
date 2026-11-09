# Android app (`mobile/`)

A Capacitor 8 shell (`com.animegirl4u.app`) that loads the live site at
`https://animegirl4u.com`. It adds native share, push notifications and Android
App Links. Brand colors: blue `#2A3FF0`, yellow `#FFD84A`. The app sends the
user agent suffix `Animegirl4uApp/1.0`; `middleware.ts` uses it to hide `/admin`
inside the app.

## Pieces

| File | Role |
|---|---|
| `mobile/capacitor.config.json` | App id, server URL, allowed navigation |
| `mobile/android/app/src/main/java/com/animegirl4u/app/MainActivity.java` | Back handling, pull-to-refresh, deep links, creates the default push channel `animegirl4u_default` |
| `mobile/android/app/src/main/AndroidManifest.xml` | `POST_NOTIFICATIONS`, FCM channel and icon metadata |
| `components/AppBridge.tsx` | Site-side bridge: share, push registration, GA4 events |
| `components/ShareButton.tsx` | Uses the native share sheet in the app |
| `app/api/push/register/route.ts` | Stores FCM tokens in `device_tokens` |
| `app/.well-known/assetlinks.json/route.ts` | App Links, from `ANDROID_SHA256_CERT_FINGERPRINTS` |

## Build

```bash
cd mobile
npm install
npx cap sync android     # or: npm run sync
```

## Push notifications setup (manual, needs your Google account)

1. Create a Firebase project and add an Android app with package `com.animegirl4u.app`.
2. Download `google-services.json` to `mobile/android/app/` and keep it out of git.
3. In `mobile/android/build.gradle`, add `classpath 'com.google.gms:google-services:4.4.2'` to `buildscript.dependencies`. The app-level `build.gradle` applies the plugin once the JSON file exists.
4. Run `npx cap sync android`.

Flow: the app asks for notification permission, registers with FCM, and posts
the token to `/api/push/register`. Tapping a notification navigates to the
`data.link` field of the payload if present. GA4 events fired: `app_open`,
`push_token_registered`, `push_permission_denied`, `push_notification_received`,
`push_notification_opened`.

To send a test push, use Firebase Console, Cloud Messaging, New campaign, and
put a `link` in the **data** payload.

## Release secrets (GitHub Actions)

`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

## Status and known gaps

- Never compiled or run on a device from the authoring environment. Build it and run the checklist below before release.
- No in-app UI to send campaigns. Stale `device_tokens` rows (unseen for 90 days) are pruned on each registration.
- Foreground notifications are shown (`presentationOptions` in `capacitor.config.json`). Silent data-only pushes are not configured.
- Play-required pages exist: `/privacy` and `/delete-data` (use these URLs in the Play Console). Not yet done: in-app review prompt.
- `mobile/www/offline.html` is the offline screen. Run `npx cap add android` once on a fresh clone to generate the Gradle project and icons, since only the customised files are tracked.
- `npm run assets` in `mobile/` points to `scripts/generate_icons.py`, which is not in the repo.

## Phone test checklist

1. Fresh install on Android 13+: the notification permission prompt appears once.
2. Allow: a row appears in `device_tokens`. Deny: no row, and `push_permission_denied` shows in GA4 Realtime.
3. Background the app, send a push with `data.link`, tap it: the app opens that URL.
4. Kill the app, send a push, tap it: the app cold-starts at the linked URL.
