/*
Your own original GIFs (the ones you generate yourself and want in the
store, as opposed to the live Tenor/Giphy search results). Zero setup:
drop a .gif/.png/.webp file into public/original-gifs/ and it appears on
the site automatically — nothing to edit here.

The title shown on the site is the filename, prettified (dashes/underscores
become spaces, capitalized) — so name your files descriptively, e.g.
"shy-wave-hello.gif" becomes "Shy Wave Hello". Rename the file any time to
change the title.
*/

import fs from "node:fs";
import path from "node:path";
import type { GifItem } from "./gifs";

const DIR = path.join(process.cwd(), "public", "original-gifs");
const EXTENSIONS = new Set([".gif", ".png", ".webp", ".jpg", ".jpeg"]);

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

/** Every file currently in public/original-gifs, newest file first. */
export function listOriginalGifs(): GifItem[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(DIR, { withFileTypes: true });
  } catch {
    return []; // folder doesn't exist yet — fine, just means 0 uploaded so far
  }

  const files = entries
    .filter((e) => e.isFile() && EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map((e) => {
      const full = path.join(DIR, e.name);
      const mtime = fs.statSync(full).mtimeMs;
      return { name: e.name, mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);

  return files.map(
    ({ name }): GifItem => ({
      id: idFromFilename(name),
      source: "original" as GifItem["source"],
      title: titleFromFilename(name),
      previewUrl: `/original-gifs/${name}`,
      fullUrl: `/original-gifs/${name}`,
      width: 480,
      height: 480,
    })
  );
}

export function getOriginalGifById(id: string): GifItem | null {
  const name = id.replace(/^original-/, "");
  return listOriginalGifs().find((g) => g.id === `original-${name}`) ?? null;
}

export function searchOriginalGifs(query: string, limit: number): GifItem[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const all = listOriginalGifs();
  if (!words.length) return all.slice(0, limit);

  // Matches if the title contains ANY query word (not the whole phrase) —
  // e.g. query "cute anime girl" matches a file titled "Anime Girl Blush".
  // Falls back to the newest originals if nothing matches, so this section
  // of the homepage/stickers page isn't just empty for an unmatched query.
  const matched = all.filter((g) => {
    const title = g.title.toLowerCase();
    return words.some((w) => title.includes(w));
  });

  return (matched.length ? matched : all).slice(0, limit);
}
