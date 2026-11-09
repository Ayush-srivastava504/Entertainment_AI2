/*
Optional extra avatars you upload yourself, read live from a Supabase
Storage bucket -- same setup as lib/api/original-gifs.ts, just a second
bucket so your own art doesn't mix with the generated set on disk.

Setup (one-time, in your Supabase dashboard):
1. Storage -> New bucket -> name it "game-avatars" -> toggle "Public bucket" on.
2. Upload image files directly into it (drag-and-drop in the dashboard).
3. Nothing else to configure: this reuses NEXT_PUBLIC_SUPABASE_URL and
   NEXT_PUBLIC_SUPABASE_ANON_KEY, which are already set from original-gifs.

Not required -- if the bucket doesn't exist or the env vars aren't set,
this just returns an empty list and the gallery falls back to the 100
generated avatars only.
*/

import { cached } from "@/lib/cache";
import type { Avatar } from "./avatars";

const BUCKET = "game-avatars";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const IMAGE_EXT = new Set([".png", ".webp", ".jpg", ".jpeg", ".svg", ".gif"]);

function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  return base
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function publicUrl(filename: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(filename)}`;
}

type StorageObject = { name: string };

async function listBucket(): Promise<StorageObject[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

  return cached("game-avatars:bucket-list", 300, async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY as string,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit: 1000, sortBy: { column: "created_at", order: "desc" } }),
      });
      if (!res.ok) return [];
      const data: StorageObject[] = await res.json();
      return data.filter((f) => IMAGE_EXT.has("." + (f.name.split(".").pop() || "").toLowerCase()));
    } catch (err) {
      console.error("[user-avatars] Supabase Storage list error:", err);
      return [];
    }
  });
}

export async function listUserAvatars(): Promise<Avatar[]> {
  const files = await listBucket();
  return files.map(
    (f): Avatar => ({
      id: `user-${f.name.replace(/\.[^.]+$/, "")}`,
      title: titleFromFilename(f.name),
      image: publicUrl(f.name),
      thumb: publicUrl(f.name),
      source: "user",
    })
  );
}
