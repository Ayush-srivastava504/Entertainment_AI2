/*
Responsive poster helpers. TMDB serves the same poster at fixed widths
(w154/w185/w342/w500/w780), and the crawler stores the w500 URL. Cards only
need ~170-280 CSS px, so serving w500 to everyone wastes bandwidth (this is
Lighthouse's "Improve image delivery"). These helpers build a srcset from the
stored URL. Non-TMDB URLs (e.g. MyAnimeList) pass through untouched.
*/

const TMDB_RE = /^(https:\/\/image\.tmdb\.org\/t\/p\/)w\d+(\/.+)$/;
const WIDTHS = [185, 342, 500];

export function posterSrcSet(url?: string | null): string | undefined {
  if (!url) return undefined;
  const m = url.match(TMDB_RE);
  if (!m) return undefined;
  return WIDTHS.map((w) => `${m[1]}w${w}${m[2]} ${w}w`).join(", ");
}

/** Default (fallback) src: a mid-size TMDB rendition instead of w500. */
export function posterSrc(url?: string | null, width = 342): string | undefined {
  if (!url) return undefined;
  const m = url.match(TMDB_RE);
  return m ? `${m[1]}w${width}${m[2]}` : url;
}
