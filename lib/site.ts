/*
Shared site-wide constants: the canonical base URL used to build absolute
links in metadata, JSON-LD, the sitemap, robots.txt, and IndexNow
submissions. Centralized here instead of each page re-deriving it so a
domain change (or a www/non-www mismatch in NEXT_PUBLIC_SITE_URL) only
needs fixing in one place.

Always resolves to the non-www origin — animegirl4u.com is canonical, not
www.animegirl4u.com — even if NEXT_PUBLIC_SITE_URL is ever set with a
leading "www." by mistake, so canonical/OG URLs never end up pointing at
a host that 301s to a different one.
*/

const DEFAULT_SITE_URL = "https://animegirl4u.com";

export function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  try {
    const url = new URL(raw);
    // Also strip a trailing dot ("animegirl4u.com."): it is a valid FQDN but a
    // different host string to Google, so canonicals/sitemap URLs built from it
    // never match the real pages.
    url.hostname = url.hostname.replace(/^www\./, "").replace(/\.+$/, "");
    return url.origin;
  } catch {
    return raw.replace(/\/$/, "");
  }
}

/**
 * The homepage URL exactly as Google reports it: "https://animegirl4u.com/"
 * with the trailing slash. Use this (not getBaseUrl()) wherever the homepage
 * itself is the target: canonical, sitemap <loc>, JSON-LD url.
 */
export function getHomeUrl(): string {
  return `${getBaseUrl()}/`;
}

export const SITE_NAME = "Animegirl4u";

/**
 * Single-GIF pages (/gif/<id>) carry one sentence of unique text (~80 words in
 * the 2026-11-19 crawl). 160 of them in the sitemap made a third of the site
 * thin, which is what keeps a new domain in "Discovered - currently not
 * indexed". They stay live and crawlable (noindex, follow) and are left out of
 * the sitemap; the sticker collection pages (/stickers/<collection>), which
 * show every GIF with alt text, are the pages meant to rank. Set true to
 * index them again once each has substantial unique text.
 */
export const INDEX_GIF_PAGES = false;
