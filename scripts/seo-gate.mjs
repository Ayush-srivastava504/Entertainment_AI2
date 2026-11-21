#!/usr/bin/env node
/*
SEO gate: checks EVERY URL the site asks search engines to index, and every
internal link on those pages, against the site's indexing rules. No browser
and no dependencies (pages are server-rendered), so it runs in GitHub
Actions in a couple of minutes and can block a bad release.

Why it exists: in Nov 2026 the site went from impressions to almost none
after batches of URLs went live that should never have been public: movie
guides, empty watch-order pages, ~80-word single-GIF pages, links to 404s.
The old scripts/seo-audit.mjs samples 6 pages per template, so it missed
most of them. This one samples nothing.

  npm run seo:gate                                   # live site
  npm run seo:gate -- --base=http://localhost:3000   # a local build (sitemap URLs are mapped to it)
  npm run seo:gate -- --no-links                     # skip the internal link pass

THE RULES (each one is an ERROR, exit code 1):
  sitemap   every <loc> answers 200 directly (no redirect, no 404/410/5xx)
            every <loc> is indexable: no noindex in meta robots or X-Robots-Tag
            every <loc> has a self-referencing canonical
            every <loc> has a <title>, a meta description and an <h1>
            every <loc> has at least MIN_WORDS words of visible main text
            no two <loc>s share a title
            every <image:loc> answers 200
  links     no internal link on a sitemap page points to a 404/410/5xx
            no internal link points to a noindex page (a URL that is linked
            but not indexable is a URL that should not exist; see docs/SEO.md)
  robots    robots.txt answers 200 and lists the sitemap

WARNINGS (printed, do not fail): titles over 60 or descriptions over 160
characters, internal links that go through a redirect, pages under
WARN_WORDS words.

Utility pages that are noindex on purpose and may be linked:
NOINDEX_ALLOWED below. Paths disallowed in robots.txt are not fetched.

Report: seo-gate-report.json in the working directory.
*/
import fs from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const LIVE = "https://animegirl4u.com";
const BASE = String(args.base || LIVE).replace(/\/$/, "");
const CHECK_LINKS = !args["no-links"];
const CONCURRENCY = Number(args.concurrency || 6);
// Main text only: header, nav, footer and scripts are not counted.
const MIN_WORDS = Number(args["min-words"] || 500);
const WARN_WORDS = 800;
const NOINDEX_ALLOWED = [/^\/search(\/|$)/, /^\/favorites(\/|$)/, /^\/games(\/|$)/, /^\/admin(\/|$)/];

const errors = [];
const warnings = [];
const E = (url, code, msg) => errors.push({ url, code, msg });
const W = (url, code, msg) => warnings.push({ url, code, msg });

/** Sitemaps list live URLs; when auditing a local build, fetch them from BASE. */
const toBase = (u) => (BASE === LIVE ? u : u.replace(/^https?:\/\/(www\.)?animegirl4u\.com/, BASE));
const pathOf = (u) => {
  const x = new URL(u);
  return x.pathname + x.search;
};

async function get(url, method = "GET") {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        redirect: "manual",
        headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) seo-gate" },
        signal: AbortSignal.timeout(45_000),
      });
      const body = method === "GET" ? await res.text() : "";
      // Retry server errors once or twice: a cold serverless start is not a site bug.
      if (res.status >= 500 && attempt < 3) continue;
      return { status: res.status, headers: res.headers, body };
    } catch (e) {
      if (attempt === 3) return { status: 0, headers: new Headers(), body: "", error: String(e) };
    }
  }
}

async function pool(items, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (i < items.length) {
        const n = i++;
        out[n] = await fn(items[n], n);
      }
    }),
  );
  return out;
}

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"))?.[1];
function metaContent(html, name) {
  for (const m of html.matchAll(/<meta\s[^>]*>/gi)) {
    const t = m[0];
    if ((attr(t, "name") || attr(t, "property") || "").toLowerCase() === name) return decode(attr(t, "content") ?? "");
  }
  return null;
}
function analyze(html) {
  const head = html.split(/<\/head>/i)[0];
  const title = decode(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "");
  const canonical = [...head.matchAll(/<link\s[^>]*>/gi)].map((m) => m[0]).find((t) => /rel="canonical"/i.test(t));
  const main = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(header|footer|nav)\b[\s\S]*?<\/\1>/gi, " ");
  const text = decode(main.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  const links = [...html.matchAll(/<a\s[^>]*href="([^"#][^"]*)"/gi)].map((m) => decode(m[1]));
  return {
    title,
    description: metaContent(head, "description"),
    robots: [metaContent(head, "robots"), metaContent(head, "googlebot")].filter(Boolean).join(", "),
    canonical: canonical ? decode(attr(canonical, "href") ?? "") : null,
    h1: (html.match(/<h1[\s>]/gi) || []).length,
    words: text ? text.split(" ").length : 0,
    links,
  };
}

// robots.txt: must exist, and its Disallow rules decide which links we skip.
const robotsRes = await get(`${BASE}/robots.txt`);
if (robotsRes.status !== 200) E(`${BASE}/robots.txt`, "robots-missing", `robots.txt answered HTTP ${robotsRes.status}`);
else if (!/^sitemap:/im.test(robotsRes.body)) E(`${BASE}/robots.txt`, "robots-no-sitemap", "robots.txt does not list a sitemap");
// Rules of the "*" group only (the named-bot groups repeat them).
const disallow = [];
{
  let inStar = false;
  for (const line of robotsRes.body.split(/\r?\n/)) {
    const [k, ...rest] = line.split(":");
    const v = rest.join(":").trim();
    if (/^user-agent$/i.test(k.trim())) inStar = v === "*";
    else if (inStar && /^disallow$/i.test(k.trim()) && v) disallow.push(v);
  }
}
const toRegex = (rule) => new RegExp("^" + rule.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, "\\?"));
const disallowRx = disallow.map(toRegex);
const isDisallowed = (p) => disallowRx.some((rx) => rx.test(p));

// Sitemaps: index -> children -> <url> entries with their images.
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]));
const indexRes = await get(`${BASE}/sitemap.xml`);
if (indexRes.status !== 200) {
  E(`${BASE}/sitemap.xml`, "sitemap-missing", `sitemap.xml answered HTTP ${indexRes.status}`);
}
const entries = [];
for (const child of locs(indexRes.body)) {
  const r = await get(toBase(child));
  if (r.status !== 200) {
    E(child, "sitemap-child-failed", `child sitemap answered HTTP ${r.status}`);
    continue;
  }
  for (const [, block] of r.body.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = decode(block.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? "");
    const images = [...block.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((m) => decode(m[1]));
    if (loc) entries.push({ loc, images, sitemap: child.split("/").pop() });
  }
}
const seen = new Set();
for (const e of entries) {
  if (seen.has(e.loc)) E(e.loc, "sitemap-duplicate", "listed twice in the sitemaps");
  seen.add(e.loc);
}
console.log(`robots.txt: ${disallow.length} disallow rules. Sitemaps: ${entries.length} URLs, ${entries.reduce((n, e) => n + e.images.length, 0)} images.`);

// Pass 1: every sitemap URL.
const titles = new Map();
const internal = new Map(); // path -> Set(of pages linking to it)
const pages = await pool(entries, async (e) => {
  const url = toBase(e.loc);
  const r = await get(url);
  const rec = { loc: e.loc, status: r.status };
  if (r.status !== 200) {
    const where = r.headers.get("location");
    E(e.loc, "sitemap-not-200", `answered HTTP ${r.status}${where ? ` -> ${where}` : ""}${r.error ? ` (${r.error})` : ""}`);
    return rec;
  }
  const a = analyze(r.body);
  Object.assign(rec, { title: a.title, words: a.words });
  const xRobots = r.headers.get("x-robots-tag") || "";
  if (/noindex|none/i.test(a.robots + " " + xRobots)) E(e.loc, "sitemap-noindex", `listed in the sitemap but noindex (${a.robots || xRobots})`);
  if (!a.canonical) E(e.loc, "canonical-missing", "no canonical link");
  else if (a.canonical.replace(/\/$/, "") !== e.loc.replace(/\/$/, "")) E(e.loc, "canonical-not-self", `canonical points elsewhere: ${a.canonical}`);
  if (!a.title) E(e.loc, "title-missing", "no <title>");
  else {
    if (a.title.length > 60) W(e.loc, "title-long", `title is ${a.title.length} characters: ${a.title}`);
    titles.set(a.title, [...(titles.get(a.title) || []), e.loc]);
  }
  if (!a.description) E(e.loc, "description-missing", "no meta description");
  else if (a.description.length > 160) W(e.loc, "description-long", `description is ${a.description.length} characters`);
  if (a.h1 === 0) E(e.loc, "h1-missing", "no <h1>");
  if (a.words < MIN_WORDS) E(e.loc, "thin", `only ${a.words} words of main text (minimum ${MIN_WORDS})`);
  else if (a.words < WARN_WORDS) W(e.loc, "thin-ish", `${a.words} words of main text`);
  for (const href of a.links) {
    let u;
    try {
      u = new URL(href, url);
    } catch {
      continue;
    }
    if (u.origin !== new URL(url).origin) continue;
    if (/^\/(_next|api)\//.test(u.pathname) || /\.(png|jpe?g|gif|webp|svg|ico|xml|txt|json)$/i.test(u.pathname)) continue;
    const p = u.pathname + u.search;
    if (isDisallowed(p)) continue;
    if (!internal.has(p)) internal.set(p, new Set());
    internal.get(p).add(e.loc);
  }
  return rec;
});
for (const [t, urls] of titles) if (urls.length > 1) E(urls[0], "title-duplicate", `${urls.length} pages share the title "${t}": ${urls.slice(1, 4).join(", ")}`);

// Images listed in the sitemap must load.
const images = [...new Set(entries.flatMap((e) => e.images))];
await pool(images, async (img) => {
  const r = await get(toBase(img), "HEAD");
  if (r.status !== 200) E(img, "image-not-200", `sitemap image answered HTTP ${r.status}`);
});

// Pass 2: every internal link found on those pages.
let linkCount = 0;
if (CHECK_LINKS) {
  const sitemapPaths = new Set(entries.map((e) => pathOf(e.loc)));
  const targets = [...internal.keys()].filter((p) => !sitemapPaths.has(p));
  linkCount = internal.size;
  await pool(targets, async (p) => {
    const from = [...internal.get(p)].slice(0, 3).join(", ");
    let r = await get(`${BASE}${p}`);
    let hops = 0;
    let at = p;
    while (r.status >= 300 && r.status < 400 && hops < 5) {
      const next = new URL(r.headers.get("location"), `${BASE}${at}`);
      if (next.origin !== new URL(BASE).origin && BASE !== LIVE) break;
      at = next.pathname + next.search;
      r = await get(`${BASE}${at}`);
      hops++;
    }
    if (hops) W(`${BASE}${p}`, "link-redirects", `internal link goes through ${hops} redirect(s) to ${at} (linked from ${from})`);
    if (r.status === 0 || r.status >= 400) {
      E(`${BASE}${p}`, "broken-link", `internal link answers HTTP ${r.status} (linked from ${from})`);
      return;
    }
    if (r.status !== 200) return;
    const a = analyze(r.body);
    const xRobots = r.headers.get("x-robots-tag") || "";
    if (/noindex|none/i.test(a.robots + " " + xRobots) && !NOINDEX_ALLOWED.some((rx) => rx.test(at.split("?")[0]))) {
      E(`${BASE}${at}`, "link-to-noindex", `linked from indexable pages but noindex: it should be indexable or not exist (linked from ${from})`);
    }
  });
}

// Report.
const byCode = (list) => list.reduce((m, x) => ((m[x.code] = (m[x.code] || 0) + 1), m), {});
fs.writeFileSync("seo-gate-report.json", JSON.stringify({ base: BASE, at: new Date().toISOString(), urls: entries.length, images: images.length, links: linkCount, errors, warnings, pages }, null, 1));
console.log(`\nChecked ${entries.length} sitemap URLs, ${images.length} images${CHECK_LINKS ? `, ${linkCount} internal link targets` : ""}.`);
console.log(`Warnings: ${warnings.length} ${JSON.stringify(byCode(warnings))}`);
console.log(`Errors:   ${errors.length} ${JSON.stringify(byCode(errors))}`);
for (const e of errors.slice(0, 60)) console.log(`  ERROR ${e.code}  ${e.url}\n        ${e.msg}`);
if (errors.length > 60) console.log(`  ... and ${errors.length - 60} more in seo-gate-report.json`);
process.exit(errors.length ? 1 : 0);
