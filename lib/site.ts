/*
Shared site-wide constants: the canonical base URL used to build absolute
links in metadata, JSON-LD, the sitemap, robots.txt, and IndexNow
submissions. Centralized here instead of each page re-deriving it so a
domain change (or a www/non-www mismatch in NEXT_PUBLIC_SITE_URL) only
needs fixing in one place.

Always resolves to the non-www origin — marquees.site is canonical, not
www.marquees.site — even if NEXT_PUBLIC_SITE_URL is ever set with a
leading "www." by mistake, so canonical/OG URLs never end up pointing at
a host that 301s to a different one.
*/

const DEFAULT_SITE_URL = "https://marquees.site";

export function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  try {
    const url = new URL(raw);
    url.hostname = url.hostname.replace(/^www\./, "");
    return url.origin;
  } catch {
    return raw.replace(/\/$/, "");
  }
}

export const SITE_NAME = "Marquee";
