/*
Sitemap builders. /sitemap.xml is a sitemap INDEX that points at small
per-section files, so Search Console and Bing Webmaster Tools report
indexing per section (anime / watch orders / pages). With one big
file you cannot tell which part of the site Google is refusing to index.

Only <loc> and an honest <lastmod> are emitted. Google ignores <priority>
and <changefreq>, and trusts <lastmod> only when it is accurate, so it is
the one field worth getting right: it is the real last content change.
*/

import { listOriginalGifs } from "@/lib/api/original-gifs";
import { STICKER_COLLECTIONS } from "@/lib/sticker-collections";
import { getPublishedAnimeSlugs } from "@/lib/api/anime";
import { getPublishedFranchiseSlugs } from "@/lib/api/franchises";
import { getIndexableEndingTopics, getIndexableWatchOrderTopics } from "@/lib/api/topic-hubs";
import { getBaseUrl, INDEX_GIF_PAGES } from "@/lib/site";
import { getCharacterSitemapRows } from "@/lib/characters-db";
import { WALLPAPERS, WALLPAPER_CATEGORIES } from "@/lib/wallpapers";

const BASE_URL = getBaseUrl();
export const SITEMAP_CHUNK = 1000;

type Row = { slug: string; updatedAt: Date };
export interface UrlEntry {
  loc: string;
  lastmod?: Date;
}

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
      return `<url><loc>${esc(e.loc)}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ""}</url>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
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
    const entries: UrlEntry[] = [
      { loc: `${BASE_URL}/`, lastmod: newest([...guides, ...franchises]) },
      { loc: `${BASE_URL}/ending-explained`, lastmod: newest(guides) },
      // The watch-order hub only while it lists something (noindex when empty).
      ...(franchises.length ? [{ loc: `${BASE_URL}/watch-order`, lastmod: newest(franchises) }] : []),
      { loc: `${BASE_URL}/about` },
      { loc: `${BASE_URL}/anime-characters` },
      { loc: `${BASE_URL}/privacy` },
      { loc: `${BASE_URL}/delete-data` },
      { loc: `${BASE_URL}/stickers` },
      { loc: `${BASE_URL}/stickers/maker` },
      ...STICKER_COLLECTIONS.map((c) => ({ loc: `${BASE_URL}/stickers/${c.slug}` })),
      { loc: `${BASE_URL}/wallpapers` },
      { loc: `${BASE_URL}/anime-characters/leads` },
      ...WALLPAPER_CATEGORIES.map((c) => ({ loc: `${BASE_URL}/wallpapers/category/${c.slug}` })),
      ...WALLPAPERS.map((w) => ({ loc: `${BASE_URL}/wallpapers/${w.slug}` })),
    ];
    if (INDEX_GIF_PAGES) {
      try {
        for (const g of await listOriginalGifs()) entries.push({ loc: `${BASE_URL}/gif/${g.id}` });
      } catch {}
    }
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
