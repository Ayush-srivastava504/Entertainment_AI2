/*
This module fetches anime GIFs/stickers from Tenor and Giphy's free
developer APIs for the homepage's "Anime stickers & GIFs" section and the
/stickers browse page. Named GifItem (not MediaItem) to avoid colliding
with lib/api/normalize.ts's MediaItem, which means a movie/anime
ending-explained title here, a completely different concept.

Neither Tenor nor Giphy content is permanently re-hosted — we only ever
call their APIs live (through the TTL cache below) and link to their own
CDN-hosted files, per both services' API terms.
*/

import { cached } from "@/lib/cache";
import { searchOriginalGifs, getOriginalGifById } from "./original-gifs";

export type GifItem = {
  id: string;
  source: "tenor" | "giphy" | "original";
  title: string;
  previewUrl: string;
  fullUrl: string;
  width: number;
  height: number;
};

const TENOR_BASE = "https://tenor.googleapis.com/v2";
const GIPHY_BASE = "https://api.giphy.com/v1/gifs";

async function searchTenor(query: string, limit: number): Promise<GifItem[]> {
  const key = process.env.TENOR_API_KEY;
  if (!key) return [];

  const url = `${TENOR_BASE}/search?q=${encodeURIComponent(query)}&key=${key}&client_key=animegirl4u&limit=${limit}&media_filter=gif`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();

  return (data.results || []).map((r: any): GifItem => ({
    id: `tenor-${r.id}`,
    source: "tenor",
    title: r.content_description || query,
    previewUrl: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url,
    fullUrl: r.media_formats?.gif?.url,
    width: r.media_formats?.gif?.dims?.[0] || 320,
    height: r.media_formats?.gif?.dims?.[1] || 320,
  }));
}

async function searchGiphy(query: string, limit: number): Promise<GifItem[]> {
  const key = process.env.GIPHY_API_KEY;
  if (!key) return [];

  const url = `${GIPHY_BASE}/search?api_key=${key}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();

  return (data.data || []).map((r: any): GifItem => ({
    id: `giphy-${r.id}`,
    source: "giphy",
    title: r.title || query,
    previewUrl: r.images?.fixed_width_small?.url || r.images?.original?.url,
    fullUrl: r.images?.original?.url,
    width: Number(r.images?.original?.width) || 320,
    height: Number(r.images?.original?.height) || 320,
  }));
}

/** Your own original GIFs first (unique content, no API quota cost, reads
 * from disk so not cached the same way), then Tenor + Giphy interleaved to
 * fill the rest, cached 1 hour so repeat loads don't burn API quota. */
export async function searchGifs(query: string, limit = 12): Promise<GifItem[]> {
  const originals = await searchOriginalGifs(query, limit);
  const remaining = limit - originals.length;
  if (remaining <= 0) return originals;

  const apiResults = await cached(`gifs:${query}:${remaining}`, 3600, async () => {
    const [tenor, giphy] = await Promise.all([
      searchTenor(query, remaining),
      searchGiphy(query, remaining),
    ]);
    const out: GifItem[] = [];
    const max = Math.max(tenor.length, giphy.length);
    for (let i = 0; i < max; i++) {
      if (tenor[i]) out.push(tenor[i]);
      if (giphy[i]) out.push(giphy[i]);
    }
    return out.slice(0, remaining);
  });

  return [...originals, ...apiResults];
}

export async function getGifById(id: string): Promise<GifItem | null> {
  if (id.startsWith("original-")) return getOriginalGifById(id);

  return cached(`gif:${id}`, 86400, async () => {
    if (id.startsWith("tenor-")) {
      const key = process.env.TENOR_API_KEY;
      if (!key) return null;
      const rawId = id.replace("tenor-", "");
      const res = await fetch(`${TENOR_BASE}/posts?ids=${rawId}&key=${key}&client_key=animegirl4u&media_filter=gif`);
      if (!res.ok) return null;
      const data = await res.json();
      const r = data.results?.[0];
      if (!r) return null;
      return {
        id: `tenor-${r.id}`,
        source: "tenor",
        title: r.content_description || "Anime GIF",
        previewUrl: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url,
        fullUrl: r.media_formats?.gif?.url,
        width: r.media_formats?.gif?.dims?.[0] || 320,
        height: r.media_formats?.gif?.dims?.[1] || 320,
      };
    }
    if (id.startsWith("giphy-")) {
      const key = process.env.GIPHY_API_KEY;
      if (!key) return null;
      const rawId = id.replace("giphy-", "");
      const res = await fetch(`${GIPHY_BASE}/${rawId}?api_key=${key}`);
      if (!res.ok) return null;
      const data = await res.json();
      const r = data.data;
      if (!r) return null;
      return {
        id: `giphy-${r.id}`,
        source: "giphy",
        title: r.title || "Anime GIF",
        previewUrl: r.images?.fixed_width_small?.url || r.images?.original?.url,
        fullUrl: r.images?.original?.url,
        width: Number(r.images?.original?.width) || 320,
        height: Number(r.images?.original?.height) || 320,
      };
    }
    return null;
  });
}
