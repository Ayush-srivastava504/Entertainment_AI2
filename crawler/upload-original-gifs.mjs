/*
One-time (or re-run-anytime) uploader for your original GIFs/stickers into
the Supabase Storage bucket that lib/api/original-gifs.ts reads from.

This deliberately uses plain fetch against the Supabase Storage REST API,
the same way lib/api/original-gifs.ts does, instead of adding the
@supabase/supabase-js package as a new dependency just for this.

Setup (one-time, in your Supabase dashboard):
1. Storage -> New bucket -> name it "original-gifs" -> toggle "Public bucket" on.
   (Skip this if the bucket already exists.)
2. Settings -> API -> copy the "service_role" secret key. This is DIFFERENT
   from the NEXT_PUBLIC_SUPABASE_ANON_KEY the site uses to read the bucket --
   uploading needs the service_role key because the anon key is read-only by
   default. Never expose the service_role key to the browser or commit it;
   it only belongs in your local .env / GitHub Actions secrets.

Usage:
  node --env-file=.env crawler/upload-original-gifs.mjs <path-to-folder-of-gifs>

  # example, uploading the extracted zip you already have:
  node --env-file=.env crawler/upload-original-gifs.mjs ./original-gifs-for-supabase

Required env vars (add the first to .env if not already there; add the
second just for this one run, or export it inline):
  NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=...

Re-running is safe: existing files are overwritten (x-upsert), new files are
added. Nothing is deleted, so renaming a local file creates an extra object
in the bucket rather than renaming the old one -- delete the old one from
the Supabase dashboard if you rename/replace a file locally.
*/

import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const BUCKET = "original-gifs";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CONTENT_TYPES = {
  ".gif": "image/gif",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error("Usage: node --env-file=.env crawler/upload-original-gifs.mjs <path-to-folder-of-gifs>");
    process.exit(1);
  }
  if (!SUPABASE_URL) {
    console.error("NEXT_PUBLIC_SUPABASE_URL is not set. Add it to .env and run with --env-file=.env");
    process.exit(1);
  }
  if (!SERVICE_ROLE_KEY) {
    console.error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Copy it from Supabase dashboard -> Settings -> API " +
        "(the 'service_role' secret, not the anon key) and export it just for this run, e.g.\n" +
        "  SUPABASE_SERVICE_ROLE_KEY=xxx node --env-file=.env crawler/upload-original-gifs.mjs " +
        dir
    );
    process.exit(1);
  }

  const entries = await readdir(dir);
  const files = [];
  for (const name of entries) {
    const full = join(dir, name);
    const s = await stat(full);
    if (s.isFile() && CONTENT_TYPES[extname(name).toLowerCase()]) files.push(name);
  }

  if (!files.length) {
    console.log(`No .gif/.png/.webp/.jpg files found in ${dir}`);
    return;
  }

  console.log(`Uploading ${files.length} file(s) to Supabase Storage bucket "${BUCKET}"...`);

  let ok = 0;
  let failed = 0;
  for (const name of files) {
    const contentType = CONTENT_TYPES[extname(name).toLowerCase()];
    const body = await readFile(join(dir, name));
    const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(name)}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body,
      });

      if (res.ok) {
        ok += 1;
        console.log(`  OK   ${name}`);
      } else {
        failed += 1;
        console.error(`  FAIL ${name}: ${res.status} ${await res.text().catch(() => "")}`);
      }
    } catch (err) {
      failed += 1;
      console.error(`  FAIL ${name}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nDone. ${ok} uploaded, ${failed} failed.`);
  if (failed) process.exit(1);
}

main();
