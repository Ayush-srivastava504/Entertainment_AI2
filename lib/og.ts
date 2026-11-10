/*
Builds the query string for the dynamic Open Graph image route at
/api/og (see app/api/og/route.tsx). Centralizing this keeps every page's
metadata block using the same param names and truncation rules.

Returns a relative URL ("/api/og?...") rather than an absolute one — Next.js
resolves relative image URLs in metadata against `metadataBase`, which is
already set in app/layout.tsx, so callers don't need to know BASE_URL.
*/

import type { Metadata } from "next";
import { getBaseUrl, SITE_NAME } from "@/lib/site";

export interface OgImageParams {
  /** Main headline, e.g. a movie/anime title or page heading. */
  title: string;
  /** Smaller line under the title — description, tagline, or stat. */
  subtitle?: string;
  /** Short uppercase label in the top-left corner, e.g. "MOVIE", "RANKING". */
  badge?: string;
  /** Absolute poster/thumbnail URL to render alongside the text. */
  poster?: string;
  /** Short rating string, e.g. "★ 8.4". */
  rating?: string;
}

export function buildOgImageUrl(params: OgImageParams): string {
  const qs = new URLSearchParams();
  qs.set("title", params.title.slice(0, 120));
  if (params.subtitle) qs.set("subtitle", params.subtitle.slice(0, 160));
  if (params.badge) qs.set("badge", params.badge.slice(0, 24));
  if (params.poster) qs.set("poster", params.poster);
  if (params.rating) qs.set("rating", params.rating.slice(0, 16));
  return `/api/og?${qs.toString()}`;
}

/**
 * Open Graph + Twitter tags for one page: its own URL, title and description,
 * and a branded 1200x630 card from /api/og (or a given image). Without this a
 * page inherits the root layout's tags, which point og:url at the homepage, so
 * a shared link previews (and can resolve) as the homepage.
 */
export function socialMeta(o: {
  title: string;
  description: string;
  /** Site path, e.g. "/watch-order". */
  path: string;
  /** Card text; defaults to `title`. */
  cardTitle?: string;
  cardSubtitle?: string;
  badge?: string;
  poster?: string;
  /** Use this image instead of a generated card (e.g. a wallpaper). */
  image?: { url: string; width?: number; height?: number; alt?: string };
  type?: "website" | "article" | "profile";
}): Pick<Metadata, "openGraph" | "twitter"> {
  const url = `${getBaseUrl()}${o.path}`;
  const image = o.image ?? {
    url: buildOgImageUrl({ title: o.cardTitle ?? o.title, subtitle: o.cardSubtitle, badge: o.badge, poster: o.poster }),
    width: 1200,
    height: 630,
    alt: o.cardTitle ?? o.title,
  };
  return {
    openGraph: { type: o.type ?? "website", url, siteName: SITE_NAME, title: o.title, description: o.description, images: [image] },
    twitter: { card: "summary_large_image", title: o.title, description: o.description, images: [image.url] },
  };
}
