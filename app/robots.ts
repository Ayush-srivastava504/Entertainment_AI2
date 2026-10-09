import { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/site";
import { listSitemapUrls } from "@/lib/sitemap";

// Hourly, same as the sitemap itself.
export const revalidate = 3600;

const BASE_URL = getBaseUrl();

// Paths no crawler needs. /api/og is carved out below because Facebook,
// X/Twitter, LinkedIn etc. obey robots.txt when fetching og:image, and every
// share-card image on this site is served from /api/og.
const DISALLOW = ["/api/", "/admin", "/favorites", "/search"];
const ALLOW = ["/", "/api/og"];

// A crawler that matches a named group IGNORES the "*" group completely, so
// each named group below repeats the full rule set. Naming Bing's crawlers
// explicitly makes the "Bing is allowed" statement unambiguous in Bing
// Webmaster Tools' robots.txt tester.
const NAMED_BOTS = [
  "Googlebot",
  "Googlebot-Image",
  "Bingbot",
  "msnbot",
  "BingPreview",
  "AdIdxBot",
  "DuckDuckBot",
  "Applebot",
  "YandexBot",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  // List the index AND every child sitemap. Google then finds the children
  // straight from robots.txt instead of depending on one index fetch, which
  // is what was leaving Search Console at "0 discovered pages". If the DB is
  // down, fall back to the index alone rather than failing robots.txt.
  let sitemaps = [`${BASE_URL}/sitemap.xml`];
  try {
    sitemaps = [`${BASE_URL}/sitemap.xml`, ...(await listSitemapUrls())];
  } catch (err) {
    console.error("robots.txt: could not list child sitemaps, using index only:", err);
  }
  return {
    rules: [
      { userAgent: "*", allow: ALLOW, disallow: DISALLOW },
      ...NAMED_BOTS.map((userAgent) => ({ userAgent, allow: ALLOW, disallow: DISALLOW })),
    ],
    // `host:` was removed on purpose: only Yandex ever read it, and Google
    // Search Console flags it as "Rule ignored by Googlebot (line 8)".
    sitemap: sitemaps,
  };
}
