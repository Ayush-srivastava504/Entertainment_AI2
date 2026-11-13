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
 * Movie guides are kept out of search for now: left out of the sitemap and
 * served with <meta name="robots" content="noindex, follow">. The pages stay
 * live for visitors. Set true to submit and index them again.
 */
export const INDEX_MOVIE_GUIDES = false;
