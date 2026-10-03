import { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/site";

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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ALLOW, disallow: DISALLOW },
      ...NAMED_BOTS.map((userAgent) => ({ userAgent, allow: ALLOW, disallow: DISALLOW })),
    ],
    // `host:` was removed on purpose: only Yandex ever read it, and Google
    // Search Console flags it as "Rule ignored by Googlebot (line 8)".
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
