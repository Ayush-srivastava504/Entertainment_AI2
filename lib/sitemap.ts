/*
Sitemap builders. /sitemap.xml is a sitemap INDEX that points at small
per-section files, so Search Console and Bing Webmaster Tools report
indexing per section (anime / watch orders / pages). With one big
file you cannot tell which part of the site Google is refusing to index.

Only <loc> and an honest <lastmod> are emitted. Google ignores <priority>
and <changefreq>, and trusts <lastmod> only when it is accurate, so it is
the one field worth getting right: it is the real last content change.
*/

import { STICKER_COLLECTIONS, getStickersInCollection } from "@/lib/sticker-collections";
import { getPublishedAnimeSlugs } from "@/lib/api/anime";
import { getPublishedFranchiseSlugs } from "@/lib/api/franchises";
import { getIndexableEndingTopics, getIndexableWatchOrderTopics } from "@/lib/api/topic-hubs";
import { getBaseUrl } from "@/lib/site";
import { getCharacterSitemapRows } from "@/lib/characters-db";
import { WALLPAPER_CATEGORIES, getWallpapersByCategory } from "@/lib/wallpapers";

const BASE_URL = getBaseUrl();
export const SITEMAP_CHUNK = 1000;

type Row = { slug: string; updatedAt: Date };
export interface UrlEntry {
  loc: string;
  lastmod?: Date;
  /** Image URLs shown on the page (Google image sitemap extension). */
  images?: string[];
}

// Google allows up to 1,000 images per <url>.
const MAX_IMAGES_PER_URL = 1000;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const iso = (d?: Date) => {
  if (!d) return undefined;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? undefined : t.toISOString();
};

const newest = (rows: { updatedAt: Date }[]) =>
  rows.length ? new Date(Math.max(...rows.map((r) => new Date(r.updatedAt).getTime()))) : undefined;

export function urlsetXml(entries: UrlEntry[]): string {
  const body = entries
    .map((e) => {
      const lm = iso(e.lastmod);
      // Only <image:loc>: Google dropped image:title/caption/geo/license in 2022.
      const imgs = (e.images ?? [])
        .slice(0, MAX_IMAGES_PER_URL)
        .map((u) => `<image:image><image:loc>${esc(u)}</image:loc></image:image>`)
        .join("");
      return `<url><loc>${esc(e.loc)}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ""}${imgs}</url>`;
    })
    .join("");
  const imageNs = entries.some((e) => e.images?.length) ? ` xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"` : "";
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${imageNs}>${body}</urlset>`;
}

export function indexXml(items: { loc: string; lastmod?: Date }[]): string {
  const body = items
    .map((e) => {
      const lm = iso(e.lastmod);
      return `<sitemap><loc>${esc(e.loc)}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ""}</sitemap>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}

async function load() {
  const [anime, franchises] = await Promise.all([
    getPublishedAnimeSlugs({ strict: true }),
    getPublishedFranchiseSlugs({ strict: true }),
  ]);
  // A row with an empty/blank slug would emit "/watch-order/" or
  // "/ending-explained/", duplicates of the hub pages. Never list those.
  const valid = (rows: Row[]) => rows.filter((r) => typeof r.slug === "string" && r.slug.trim() !== "");
  return { anime: valid(anime as Row[]), franchises: valid(franchises as Row[]) };
}

const chunks = <T,>(rows: T[]) => {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += SITEMAP_CHUNK) out.push(rows.slice(i, i + SITEMAP_CHUNK));
  return out;
};

export async function buildSitemapIndex(): Promise<string> {
  const { anime, franchises } = await load();
  const items: { loc: string; lastmod?: Date }[] = [
    { loc: `${BASE_URL}/sitemaps/pages.xml`, lastmod: newest([...anime, ...franchises]) },
  ];
  if (franchises.length) items.push({ loc: `${BASE_URL}/sitemaps/watch-order.xml`, lastmod: newest(franchises) });
  chunks(anime).forEach((c, i) => items.push({ loc: `${BASE_URL}/sitemaps/anime-${i + 1}.xml`, lastmod: newest(c) }));
  return indexXml(items);
}

/** `name` is the file name without extension, e.g. "anime-2" or "pages". */
export async function buildSitemapByName(name: string): Promise<string | null> {
  const { anime, franchises } = await load();
  const guides = anime;

  if (name === "pages") {
    // The GIFs and wallpapers are the site's main content. They have no
    // single pages (those redirect to the collection), so each image is
    // listed on the collection page that shows it. That is how they get into Google Images. A failed bucket
    // listing just leaves the images out; the page URLs are still listed.
    const stickerImages = await Promise.all(
      STICKER_COLLECTIONS.map((c) => getStickersInCollection(c.slug).then((items) => items.map((g) => g.fullUrl)).catch(() => []))
    );
    const entries: UrlEntry[] = [
      { loc: `${BASE_URL}/`, lastmod: newest([...guides, ...franchises]) },
      { loc: `${BASE_URL}/ending-explained`, lastmod: newest(guides) },
      // The watch-order hub only while it lists something (noindex when empty).
      ...(franchises.length ? [{ loc: `${BASE_URL}/watch-order`, lastmod: newest(franchises) }] : []),
      { loc: `${BASE_URL}/about` },
      // /privacy and /delete-data stay live and linked, but are not listed:
      // legal pages of a few dozen words are not pages to ask Google to rank.
      { loc: `${BASE_URL}/anime-characters` },
      { loc: `${BASE_URL}/stickers` },
      { loc: `${BASE_URL}/stickers/maker` },
      { loc: `${BASE_URL}/anime-girl-pfp` },
      ...STICKER_COLLECTIONS.map((c, i) => ({ loc: `${BASE_URL}/stickers/${c.slug}`, images: stickerImages[i] })),
      { loc: `${BASE_URL}/wallpapers` },
      { loc: `${BASE_URL}/anime-characters/leads` },
      ...WALLPAPER_CATEGORIES.map((c) => ({
        loc: `${BASE_URL}/wallpapers/category/${c.slug}`,
        images: getWallpapersByCategory(c.slug).map((w) => `${BASE_URL}${w.src}`),
      })),
    ];
    // Character profiles (Supabase). A DB error must not take the whole
    // "pages" sitemap down, so just leave them out of this build.
    try {
      for (const c of await getCharacterSitemapRows()) entries.push({ loc: `${BASE_URL}/anime-characters/${c.slug}`, lastmod: c.updatedAt });
    } catch (err) {
      console.error("sitemap: character rows unavailable:", err);
    }
    // Topic hubs only when the topic itself has enough guides (same rule as
    // the page's robots tag, lib/api/topic-hubs.ts).
    for (const t of await getIndexableEndingTopics()) entries.push({ loc: `${BASE_URL}/ending-explained/topic/${t.slug}`, lastmod: newest(guides) });
    for (const t of await getIndexableWatchOrderTopics()) entries.push({ loc: `${BASE_URL}/watch-order/topic/${t.slug}`, lastmod: newest(franchises) });
    return urlsetXml(entries);
  }

  if (name === "watch-order") {
    return franchises.length
      ? urlsetXml(franchises.map((f) => ({ loc: `${BASE_URL}/watch-order/${f.slug}`, lastmod: f.updatedAt })))
      : null;
  }

  const m = name.match(/^anime-(\d+)$/);
  if (m) {
    const rows = chunks(anime)[Number(m[1]) - 1];
    if (!rows) return null;
    return urlsetXml(rows.map((r) => ({ loc: `${BASE_URL}/ending-explained/${r.slug}`, lastmod: r.updatedAt })));
  }
  return null;
}

/** Every concrete sitemap URL, for scripts and robots. */
export async function listSitemapUrls(): Promise<string[]> {
  const xml = await buildSitemapIndex();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1]);
}
