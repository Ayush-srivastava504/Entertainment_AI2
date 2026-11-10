/*
GIFs and stickers for the homepage strip, /stickers and /gif/[id]. Only the
site's own original GIFs (Supabase Storage, see ./original-gifs.ts) are used:
they download directly from this site and are unique content. Third-party
Tenor/Giphy results were removed because downloading them sent people off-site.

Named GifItem (not MediaItem) to avoid colliding with lib/api/normalize.ts's
MediaItem, which is a movie/anime ending-explained title.
*/

import { searchOriginalGifs, getOriginalGifById } from "./original-gifs";

export type GifItem = {
  id: string;
  source: "original";
  title: string;
  previewUrl: string;
  fullUrl: string;
  width: number;
  height: number;
};

/** Original GIFs matching the query (all originals if nothing matches). */
export async function searchGifs(query: string, limit = 12): Promise<GifItem[]> {
  return searchOriginalGifs(query, limit);
}

/** Old "tenor-…" / "giphy-…" ids resolve to null, so those retired pages 404. */
export async function getGifById(id: string): Promise<GifItem | null> {
  return id.startsWith("original-") ? getOriginalGifById(id) : null;
}
