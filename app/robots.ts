import { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/site";

const BASE_URL = getBaseUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /admin sits behind an auth redirect (see middleware.ts), not a
        // noindex tag, so keep the whole tree out of crawlers' way.
        // /favorites is per-browser (no accounts): nothing worth indexing.
        disallow: ["/api/", "/admin", "/favorites", "/search"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
