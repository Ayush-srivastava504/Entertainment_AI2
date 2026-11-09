/*
Your own original GIFs/stickers, served from a Supabase Storage bucket
instead of being committed into git -- binary files don't belong in a repo,
they bloat every future clone/pull/push forever. This reads the bucket's
file list live (cached 5 min) so dropping a new file into Supabase Storage
is still zero-code, same as the old local-folder approach, just pointed at
a better place.

Setup (one-time, in your Supabase dashboard):
1. Storage -> New bucket -> name it "original-gifs" -> toggle "Public bucket" on.
2. Upload your GIF/PNG files directly into it (drag-and-drop in the dashboard).
3. In Vercel, make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
   are set (same two values from your Supabase project's Settings -> API --
   these may already be set from earlier).

The title shown on the site is the filename, prettified -- name files like
"shy-wave-hello.gif" to get "Shy Wave Hello" automatically.
*/

import { cached } from "@/lib/cache";
import type { GifItem } from "./gifs";

const BUCKET = "original-gifs";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Listing a bucket needs a SELECT policy on storage.objects even when the
// bucket is public (public only opens the direct file URLs). The server-only
// service role key bypasses that; the anon key needs the policy in
// docs/DEPLOYMENT.md. The key is never sent to the browser.
const SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const IMAGE_EXT = new Set([".gif", ".png", ".webp", ".jpg", ".jpeg"]);

function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  return base
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function idFromFilename(filename: string): string {
  return `original-${filename.replace(/\.[^.]+$/, "")}`;
}

function publicUrl(filename: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(filename)}`;
}

type StorageObject = { name: string; metadata?: { size?: number } };

/** Every file in the Supabase Storage bucket, newest upload first. Cached
 * 5 minutes so new uploads show up quickly without hitting Supabase on
 * every single page view. */
async function fetchBucketList(): Promise<StorageObject[]> {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    // `prefix` is REQUIRED by the Storage list endpoint; without it Supabase
    // answers 400 and the bucket looks empty.
    body: JSON.stringify({
      prefix: "",
      limit: 1000,
      offset: 0,
      sortBy: { column: "created_at", order: "desc" },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Supabase Storage list failed: ${res.status} ${await res.text().catch(() => "")}`);
  const data: StorageObject[] = await res.json();
  return data.filter((f) => IMAGE_EXT.has("." + (f.name.split(".").pop() || "").toLowerCase()));
}

/** Every file in the Supabase Storage bucket, newest upload first. Cached
 * 5 minutes on success only -- a failed/empty lookup is never cached, so a
 * transient error can't hide your stickers for 5 minutes. */
async function listBucket(): Promise<StorageObject[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[original-gifs] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) not set");
    return [];
  }
  try {
    return await cached("original-gifs:bucket-list", 300, fetchBucketList);
  } catch (err) {
    console.error("[original-gifs]", err);
    return [];
  }
}

export async function listOriginalGifs(): Promise<GifItem[]> {
  const files = await listBucket();
  return files.map(
    (f): GifItem => ({
      id: idFromFilename(f.name),
      source: "original" as GifItem["source"],
      title: titleFromFilename(f.name),
      previewUrl: publicUrl(f.name),
      fullUrl: publicUrl(f.name),
      width: 480,
      height: 480,
    })
  );
}

export async function getOriginalGifById(id: string): Promise<GifItem | null> {
  const name = id.replace(/^original-/, "");
  const all = await listOriginalGifs();
  return all.find((g) => g.id === `original-${name}`) ?? null;
}

export async function searchOriginalGifs(query: string, limit: number): Promise<GifItem[]> {
  const all = await listOriginalGifs();
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return all.slice(0, limit);

  const matched = all.filter((g) => {
    const title = g.title.toLowerCase();
    return words.some((w) => title.includes(w));
  });

  return (matched.length ? matched : all).slice(0, limit);
}
