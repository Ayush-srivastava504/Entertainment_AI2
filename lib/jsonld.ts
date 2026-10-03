/*
Shared JSON-LD helpers. Every page links its entities through stable @id
values (#organization, #website) so search engines see one connected graph
instead of several unrelated blobs.
*/

import { getBaseUrl, SITE_NAME } from "@/lib/site";

const BASE_URL = getBaseUrl();

export const ORG_ID = `${BASE_URL}/#organization`;
export const WEBSITE_ID = `${BASE_URL}/#website`;

export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: BASE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${BASE_URL}/icon/512`,
      width: 512,
      height: 512,
    },
    description:
      "Marquee publishes plain-English ending explained guides and franchise watch orders for movies and anime.",
  };
}

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: BASE_URL,
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
