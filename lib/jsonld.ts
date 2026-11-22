/*
Shared JSON-LD helpers. Every page links its entities through stable @id
values (#organization, #website) so search engines see one connected graph
instead of several unrelated blobs.
*/

import { getBaseUrl, getHomeUrl, SITE_NAME } from "@/lib/site";

const BASE_URL = getBaseUrl();
const HOME_URL = getHomeUrl();

export const ORG_ID = `${BASE_URL}/#organization`;
export const WEBSITE_ID = `${BASE_URL}/#website`;

export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: HOME_URL,
    logo: {
      "@type": "ImageObject",
      url: `${BASE_URL}/icon-512.png`,
      width: 512,
      height: 512,
    },
    description:
      "Animegirl4u is a free library of anime girl GIFs, stickers, PFPs and HD wallpapers, with anime ending explained guides and watch orders.",
  };
}

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    // Site-name variants Google may show above the result (people search
    // "animegirl4u" and "anime girl 4u").
    alternateName: ["Anime Girl 4U", "animegirl4u.com"],
    url: HOME_URL,
    inLanguage: "en",
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbNode(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${BASE_URL}${item.path}`,
    })),
  };
}

/**
 * ImageObject for one of the site's own images (GIF, sticker, PFP, wallpaper),
 * with the licence fields Google Images reads to show licence details and
 * credit: license + acquireLicensePage point to /license, creator and
 * creditText name the site. See app/license/page.tsx for what the licence says.
 */
export function imageObject(contentUrl: string, opts: { name?: string; caption?: string; width?: number; height?: number } = {}) {
  return {
    "@type": "ImageObject",
    contentUrl,
    ...(opts.name ? { name: opts.name } : {}),
    ...(opts.caption ? { caption: opts.caption } : {}),
    ...(opts.width && opts.height ? { width: opts.width, height: opts.height } : {}),
    license: `${BASE_URL}/license`,
    acquireLicensePage: `${BASE_URL}/license`,
    creditText: SITE_NAME,
    creator: { "@id": ORG_ID },
    copyrightNotice: SITE_NAME,
  };
}

/** Wraps nodes in one @graph document. */
export function graph(...nodes: object[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}

/** Safe to inline in a <script>: escapes "<" so content can never close the tag. */
export function jsonLdString(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}


/**
 * Article node for a guide page. Links to the site-wide Organization and
 * WebSite nodes by @id (they are emitted once in app/layout.tsx), so the
 * author/publisher are real entities instead of missing fields. The author
 * is the Organization on purpose: do not invent a person.
 */
export function articleNode(opts: {
  url: string;
  headline: string;
  description?: string;
  images?: string[];
  datePublished?: string;
  dateModified?: string;
  wordCount?: number;
  section?: string;
  keywords?: string[];
  about?: object;
}) {
  return {
    "@type": "Article",
    "@id": `${opts.url}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": opts.url },
    url: opts.url,
    headline: opts.headline.slice(0, 110),
    description: opts.description,
    image: opts.images && opts.images.length ? opts.images : undefined,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    wordCount: opts.wordCount,
    articleSection: opts.section,
    keywords: opts.keywords && opts.keywords.length ? opts.keywords.join(", ") : undefined,
    inLanguage: "en",
    isAccessibleForFree: true,
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": WEBSITE_ID },
    about: opts.about,
  };
}
