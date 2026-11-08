# What this zip actually is

This is **not your whole repo**. I (the assistant) was never given your full
Animegirl4u / Next.js codebase in this conversation — only a partial Session 1/2
output zip, plus what I built in Session 3. This zip is just those two
combined into one, so you don't have to merge two separate zips by hand.

Every file here is either:
- new (safe to drop straight into your repo at the matching path), or
- a full replacement for a file Session 1/2 or Session 3 already gave you
  in full (also safe to drop in — it overwrites, not merges), or
- a `.patch` file for an existing file in your repo that I never had full
  access to (`lib/analytics.ts` for `site-patches/session2-site.patch` and
  `site-patches/session3-site.patch`) — these must be applied with
  `git apply`, not copy-pasted, since I don't have the rest of that file.

## Files and what to do with each

| Path | What it is | Action |
|---|---|---|
| `HANDOFF.md` | Session 3 handoff (supersedes Session 2's) | Replace |
| `components/AppBridge.tsx` | Share + push bridge, full file | Replace |
| `components/ShareButton.tsx` | Session 2, unchanged since | Replace (if not already there) |
| `app/.well-known/assetlinks.json/route.ts` | Session 2, unchanged since | Add (if not already there) |
| `app/api/push/register/route.ts` | Session 3, new | Add |
| `mobile/package.json` | Full file, includes push-notifications dep | Replace |
| `mobile/package-lock.json` | Session 2's lockfile — **likely stale** now that push-notifications was added; delete and run `npm install` fresh rather than trusting this file | Delete, regenerate |
| `mobile/capacitor.config.json` | Session 1/2, unchanged since | Replace (if not already there) |
| `mobile/android/app/build.gradle` | Session 2, unchanged since | Replace (if not already there) |
| `mobile/android/app/src/main/AndroidManifest.xml` | Full file, Session 3 push additions included | Replace |
| `mobile/android/app/src/main/java/site/animegirl4u/app/MainActivity.java` | Full file, Session 3 push channel additions included | Replace |
| `mobile/android/app/src/main/res/values/push_notifications.xml` | Session 3, new | Add |
| `site-patches/session2-site.patch` | Patch against `lib/analytics.ts` (adds `"share"`) and 1-2 other files I never had in full | `git apply` |
| `site-patches/session3-site.patch` | Patch against `lib/analytics.ts` (adds 5 push/analytics event names) | `git apply` |

## What's genuinely missing

Files I have never seen at all, in any session: `lib/analytics.ts` itself
(only patch fragments), `lib/db.ts` or whatever your actual Postgres helper
is called, `schema.sql`, `app/layout.tsx`, and everything else in your repo
that was never part of a deliverable zip or a patch. Apply the two patches
above by hand if `git apply` fails on them (they were written from memory of
a few lines of context, not the real file) — open `lib/analytics.ts`, find
the `AnalyticsEvent` union type, and add the new event name strings after
`"share"` yourself if the patch doesn't apply cleanly.

## Apply order

```bash
cd /path/to/your/animegirl4u-repo
unzip -o animegirl4u-android-combined.zip -d /tmp/animegirl4u-combined
# copy/overwrite the full files listed above from /tmp/animegirl4u-combined into your repo
git apply /tmp/animegirl4u-combined/site-patches/session2-site.patch   # if not already applied
git apply /tmp/animegirl4u-combined/site-patches/session3-site.patch
cd mobile && rm -f package-lock.json && npm install && npx cap sync android
```
