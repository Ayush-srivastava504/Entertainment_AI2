#!/usr/bin/env node
/*
SEO pre-flight audit (Playwright). Run BEFORE deploying so "Crawled / Discovered -
currently not indexed" problems in Google Search Console are caught locally.

  npm run seo:audit                       # audits http://localhost:3000 (start `npm run build && npm start` first)
  npm run seo:audit -- --base=https://animegirl4u.com
  npm run seo:audit -- --per-group=15     # pages sampled per URL template (default 6)
  npm run seo:audit -- --all              # audit every sitemap URL (slow)
  npm run seo:audit -- --max=400          # hard cap on pages rendered

What it checks, per rendered page (real Chromium, so JS-injected tags count):
  status / redirect chains / soft-404 text, X-Robots-Tag + meta robots (noindex),
  robots.txt blocking, <title> + meta description (presence, length, duplicates),
  canonical (present, absolute, self-referencing, same host, not redirecting),
  exactly one <h1>, <html lang>, viewport, Open Graph + Twitter tags, og:image
  reachable, JSON-LD parses, thin content (word count), images missing alt,
  broken internal links (sampled), orphan check (sitemap URL not linked anywhere
  crawled). Site-level: robots.txt, sitemap index + child sitemaps (valid XML,
  URLs 200, not noindex, not redirected, no duplicates, same host), 404 page
  returns a real 404.

Exit code 1 when any ERROR is found (so it can gate CI / deploy).
Report written to seo-audit-report.json in the working directory.
*/
import { chromium } from "playwright";
import fs from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const BASE = String(args.base || "http://localhost:3000").replace(/\/$/, "");
const PER_GROUP = Number(args["per-group"] || 6);
const MAX_PAGES = Number(args.max || 300);
const ALL = !!args.all;
const CONCURRENCY = Number(args.concurrency || 4);
const origin = new URL(BASE).origin;
const isLocal = /localhost|127\.0\.0\.1/.test(origin);

const issues = []; // {sev, url, code, msg}
const add = (sev, url, code, msg) => issues.push({ sev, url, code, msg });
const norm = (u) => {
  try {
    const x = new URL(u, BASE);
    x.hash = "";
    return x.toString();
  } catch {
    return null;
  }
};

async function get(url, init = {}) {
  try {
    return await fetch(url, { redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (compatible; SeoAudit/1.0)" }, ...init });
  } catch (e) {
    return { status: 0, headers: new Headers(), text: async () => "", error: e };
  }
}

/* ---------------- robots.txt ---------------- */
function parseRobots(txt) {
  const groups = [];
  let cur = null;
  const sitemaps = [];
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const k = m[1].toLowerCase();
    const v = m[2].trim();
    if (k === "user-agent") {
      if (!cur || cur.rules.length) groups.push((cur = { agents: [], rules: [] }));
      cur.agents.push(v.toLowerCase());
    } else if (k === "allow" || k === "disallow") cur?.rules.push({ allow: k === "allow", path: v });
    else if (k === "sitemap") sitemaps.push(v);
  }
  return { groups, sitemaps };
}
function robotsAllows(robots, path, agent = "googlebot") {
  const g = robots.groups.find((g) => g.agents.includes(agent)) || robots.groups.find((g) => g.agents.includes("*"));
  if (!g) return true;
  let best = null;
  for (const r of g.rules) {
    if (!r.path) continue;
    if (path.startsWith(r.path.replace(/\*.*$/, "")) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
  }
  return best ? best.allow : true;
}

/* ---------------- sitemaps ---------------- */
const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));

async function loadSitemaps(robots) {
  const urls = new Map(); // url -> sitemap name
  const rootUrl = `${BASE}/sitemap.xml`;
  const root = await get(rootUrl);
  if (root.status !== 200) {
    add("ERROR", rootUrl, "sitemap-missing", `sitemap.xml returned ${root.status}`);
    return urls;
  }
  const xml = await root.text();
  if (!/<(urlset|sitemapindex)[\s>]/.test(xml)) add("ERROR", rootUrl, "sitemap-invalid", "Not a valid sitemap XML document");
  const ctype = root.headers.get("content-type") || "";
  if (!/xml/.test(ctype)) add("WARN", rootUrl, "sitemap-ctype", `Content-Type is "${ctype}", expected xml`);
  const children = /<sitemapindex/.test(xml) ? locs(xml) : [rootUrl];
  const listed = new Set(robots.sitemaps);
  if (!listed.size) add("WARN", `${BASE}/robots.txt`, "robots-no-sitemap", "robots.txt has no Sitemap: line");
  for (const child of children) {
    // Sitemap index entries point at production host; rewrite to BASE when auditing locally.
    const fetchUrl = isLocal ? new URL(new URL(child).pathname, BASE).toString() : child;
    const r = child === rootUrl ? root : await get(fetchUrl);
    if (r.status !== 200) {
      add("ERROR", fetchUrl, "sitemap-child-status", `Child sitemap returned ${r.status}`);
      continue;
    }
    const body = child === rootUrl ? xml : await r.text();
    const found = locs(body);
    if (found.length > 50000) add("ERROR", fetchUrl, "sitemap-too-big", `${found.length} URLs (limit 50,000)`);
    if (!found.length) add("WARN", fetchUrl, "sitemap-empty", "Child sitemap has no URLs");
    const name = new URL(fetchUrl).pathname.split("/").pop();
    for (const u of found) {
      const key = isLocal ? new URL(new URL(u).pathname + new URL(u).search, BASE).toString() : u;
      if (urls.has(key)) add("WARN", u, "sitemap-dup", `Listed in both ${urls.get(key)} and ${name}`);
      else urls.set(key, name);
      if (!isLocal && new URL(u).origin !== origin) add("ERROR", u, "sitemap-host", `Sitemap URL host differs from ${origin}`);
    }
  }
  return urls;
}

/* ---------------- grouping ---------------- */
function groupOf(u) {
  const p = new URL(u).pathname.replace(/\/$/, "");
  const parts = p.split("/").filter(Boolean);
  if (parts.length <= 1) return "static:" + (parts[0] || "home");
  return parts[0] + "/*".repeat(parts.length - 1);
}
function sample(urls) {
  const byGroup = new Map();
  for (const u of urls) {
    const g = groupOf(u);
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(u);
  }
  const picked = [];
  for (const [g, list] of byGroup) {
    if (ALL || g.startsWith("static:")) picked.push(...list);
    else {
      // evenly spread through the list (first, last, and middle ones) rather than the first N
      const step = Math.max(1, Math.floor(list.length / PER_GROUP));
      for (let i = 0; i < list.length && picked.filter((x) => groupOf(x) === g).length < PER_GROUP; i += step) picked.push(list[i]);
    }
  }
  return { picked: picked.slice(0, MAX_PAGES), groups: byGroup };
}

/* ---------------- per-page audit ---------------- */
const seen = { titles: new Map(), descs: new Map(), h1s: new Map() };
const linkGraph = new Set(); // all internal URLs discovered through links
const brokenCache = new Map();
const results = [];

async function auditPage(ctx, url, robots, inSitemap) {
  const page = await ctx.newPage();
  const chain = [];
  page.on("response", (r) => {
    const s = r.status();
    if (s >= 300 && s < 400 && r.request().resourceType() === "document") chain.push(`${s} ${r.url()}`);
  });
  const failedAssets = [];
  page.on("response", (r) => {
    if (r.status() >= 400 && r.request().resourceType() !== "document" && new URL(r.url()).origin === origin) failedAssets.push(`${r.status()} ${r.url()}`);
  });
  let resp;
  try {
    resp = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  } catch (e) {
    try {
      resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    } catch (e2) {
      add("ERROR", url, "load-failed", String(e2.message).split("\n")[0]);
      await page.close();
      return;
    }
  }
  const status = resp?.status() ?? 0;
  const finalUrl = norm(page.url());
  const path = new URL(url).pathname;
  const E = (c, m) => add("ERROR", url, c, m);
  const W = (c, m) => add("WARN", url, c, m);

  if (status >= 400) E("status", `HTTP ${status}${inSitemap ? " but listed in sitemap" : ""}`);
  if (chain.length) (inSitemap ? E : W)("redirect", `Redirects: ${chain.join(" -> ")} -> ${finalUrl}${inSitemap ? " (sitemap must list final URLs)" : ""}`);
  if (finalUrl && finalUrl !== norm(url) && !chain.length) W("client-redirect", `Ended up at ${finalUrl}`);

  const xrobots = (await resp?.headerValue("x-robots-tag")) || "";
  const data = await page.evaluate(() => {
    const m = (sel, attr = "content") => document.querySelector(sel)?.getAttribute(attr) ?? null;
    const text = document.body?.innerText || "";
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent || "");
    return {
      title: document.title,
      desc: m('meta[name="description"]'),
      robots: m('meta[name="robots"]'),
      googlebot: m('meta[name="googlebot"]'),
      canonicals: [...document.querySelectorAll('link[rel="canonical"]')].map((l) => l.getAttribute("href")),
      h1: [...document.querySelectorAll("h1")].map((h) => h.innerText.trim()),
      lang: document.documentElement.lang,
      viewport: m('meta[name="viewport"]'),
      og: Object.fromEntries(["og:title", "og:description", "og:image", "og:url", "og:type"].map((k) => [k, m(`meta[property="${k}"]`)])),
      tw: m('meta[name="twitter:card"]'),
      words: text.split(/\s+/).filter(Boolean).length,
      bodyText: text.slice(0, 1500),
      ld,
      noAlt: [...document.images].filter((i) => !i.hasAttribute("alt")).length,
      imgs: document.images.length,
      links: [...document.querySelectorAll("a[href]")].map((a) => a.href),
      noindexHint: !!document.querySelector('meta[name="robots"][content*="noindex" i]'),
    };
  });

  const robotsAll = `${xrobots} ${data.robots || ""} ${data.googlebot || ""}`.toLowerCase();
  const noindex = /noindex|none/.test(robotsAll);
  if (noindex && inSitemap) E("noindex-in-sitemap", `Page is noindex (${robotsAll.trim()}) but listed in sitemap -> GSC "Excluded by noindex"`);
  const indexable = status < 400 && !noindex;

  if (!robotsAllows(robots, path)) (inSitemap ? E : W)("robots-blocked", `Blocked by robots.txt${inSitemap ? " but listed in sitemap" : ""}`);

  if (indexable) {
    // title
    if (!data.title) E("title-missing", "No <title>");
    else {
      if (data.title.length < 15) W("title-short", `Title only ${data.title.length} chars: "${data.title}"`);
      if (data.title.length > 65) W("title-long", `Title ${data.title.length} chars (will be truncated): "${data.title}"`);
      if (!seen.titles.has(data.title)) seen.titles.set(data.title, []);
      seen.titles.get(data.title).push(url);
    }
    // description
    if (!data.desc) E("desc-missing", "No meta description");
    else {
      if (data.desc.length < 70) W("desc-short", `Description only ${data.desc.length} chars`);
      if (data.desc.length > 165) W("desc-long", `Description ${data.desc.length} chars (truncated in SERP)`);
      if (!seen.descs.has(data.desc)) seen.descs.set(data.desc, []);
      seen.descs.get(data.desc).push(url);
    }
    // canonical
    if (data.canonicals.length === 0) E("canonical-missing", "No rel=canonical");
    else if (data.canonicals.length > 1) E("canonical-multiple", `${data.canonicals.length} canonicals: ${data.canonicals.join(", ")}`);
    else {
      const c = data.canonicals[0];
      let cu;
      try {
        cu = new URL(c);
      } catch {
        cu = null;
      }
      if (!cu) E("canonical-relative", `Canonical must be absolute, got "${c}"`);
      else {
        if (!isLocal && cu.origin !== origin) E("canonical-host", `Canonical points to ${cu.origin}, expected ${origin}`);
        const a = cu.pathname.replace(/\/$/, "") + cu.search;
        const b = new URL(finalUrl).pathname.replace(/\/$/, "") + new URL(finalUrl).search;
        if (a !== b) E("canonical-mismatch", `Canonical ${c} differs from page URL ${finalUrl} -> Google may drop this page as "Duplicate, Google chose different canonical"`);
      }
    }
    // headings / structure
    if (data.h1.length === 0) E("h1-missing", "No <h1>");
    else if (data.h1.length > 1) W("h1-multiple", `${data.h1.length} <h1> tags`);
    if (!data.lang) W("lang-missing", "<html lang> missing");
    if (!data.viewport) E("viewport-missing", "No viewport meta (mobile-first indexing)");
    // social
    for (const k of ["og:title", "og:description", "og:image"]) if (!data.og[k]) W("og-missing", `Missing ${k}`);
    if (!data.tw) W("twitter-missing", "Missing twitter:card");
    // content
    if (data.words < 150) W("thin-content", `Only ${data.words} words of visible text -> risk of "Crawled - currently not indexed"`);
    if (/page not found|404|doesn['’]t exist|no results found|something went wrong/i.test(data.bodyText) && status === 200)
      W("soft-404", "200 response but body looks like an error / empty state (soft 404)");
    if (data.noAlt) W("img-alt", `${data.noAlt}/${data.imgs} images without alt attribute`);
    // JSON-LD
    for (const raw of data.ld) {
      try {
        const j = JSON.parse(raw);
        const nodes = Array.isArray(j) ? j : j["@graph"] || [j];
        for (const n of nodes) if (!n["@type"]) W("jsonld-type", "JSON-LD block without @type");
      } catch (e) {
        E("jsonld-invalid", `Invalid JSON-LD: ${e.message}`);
      }
    }
    if (!data.ld.length && groupOf(url) !== "static:home" && path.split("/").length > 2) W("jsonld-missing", "No structured data (JSON-LD)");
    // og:image reachable
    if (data.og["og:image"]) {
      const imgUrl = norm(data.og["og:image"]);
      if (imgUrl && !brokenCache.has(imgUrl)) {
        const r = await get(isLocal ? imgUrl.replace(new URL(imgUrl).origin, origin) : imgUrl, { method: "GET" });
        brokenCache.set(imgUrl, r.status);
      }
      const st = brokenCache.get(imgUrl);
      if (st && st >= 400) W("og-image-broken", `og:image returned ${st}: ${imgUrl}`);
    }
  }

  if (failedAssets.length) W("asset-failed", `${failedAssets.length} same-origin assets failed: ${failedAssets.slice(0, 3).join(" | ")}`);

  const internal = [];
  for (const l of data.links) {
    const n = norm(l);
    if (!n || !/^https?:/.test(n)) continue;
    if (new URL(n).origin === origin || (!isLocal && new URL(n).hostname.replace(/^www\./, "") === new URL(origin).hostname)) {
      internal.push(n);
      linkGraph.add(n.replace(/\/$/, ""));
    }
  }
  results.push({ url, status, indexable, title: data.title, canonical: data.canonicals[0], words: data.words, internal: [...new Set(internal)] });
  await page.close();
}

/* ---------------- main ---------------- */
async function pool(items, n, fn) {
  const q = [...items];
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (q.length) {
        const it = q.shift();
        const i = items.length - q.length;
        process.stdout.write(`\r  ${i}/${items.length} pages`);
        await fn(it);
      }
    }),
  );
  process.stdout.write("\n");
}

const t0 = Date.now();
console.log(`SEO audit of ${BASE}${isLocal ? " (local)" : ""}`);

// robots.txt
const rb = await get(`${BASE}/robots.txt`);
let robots = { groups: [], sitemaps: [] };
if (rb.status !== 200) add("ERROR", `${BASE}/robots.txt`, "robots-missing", `robots.txt returned ${rb.status}`);
else {
  const txt = await rb.text();
  robots = parseRobots(txt);
  if (robotsAllows(robots, "/") === false) add("ERROR", `${BASE}/robots.txt`, "robots-blocks-all", "Googlebot is disallowed from /  — site will not be indexed");
}

// soft-404 check on the site itself
const nf = await get(`${BASE}/this-page-should-not-exist-${Date.now()}`);
if (nf.status !== 404) add("ERROR", `${BASE}/<random>`, "soft-404-site", `Unknown URL returns ${nf.status}, must be 404`);

// www / trailing slash / http host variants (production only)
if (!isLocal) {
  const host = new URL(origin).hostname;
  const w = await get(`https://www.${host}/`);
  if (![301, 308].includes(w.status)) add("WARN", `https://www.${host}/`, "www-redirect", `www host returns ${w.status}; expected 301/308 to ${origin}`);
  const h = await get(`http://${host}/`);
  if (![301, 308].includes(h.status)) add("WARN", `http://${host}/`, "http-redirect", `http returns ${h.status}; expected 301/308 to https`);
}

const sitemapUrls = await loadSitemaps(robots);
console.log(`  sitemap: ${sitemapUrls.size} URLs`);
const { picked, groups } = sample([...sitemapUrls.keys()]);
console.log(`  URL templates found: ${[...groups].map(([g, l]) => `${g} (${l.length})`).join(", ")}`);

// Always render a seed set too, even if the sitemap is empty/failed.
const seeds = ["/", "/about", "/privacy", "/anime", "/movies", "/genres", "/rankings", "/characters", "/wallpapers", "/stickers", "/games", "/ending-explained", "/watch-order", "/search", "/favorites", "/delete-data"].map((p) => norm(p));
const queue = [...new Set([...seeds, ...picked])].slice(0, MAX_PAGES + seeds.length);
const sitemapSet = new Set(sitemapUrls.keys());

console.log(`  rendering ${queue.length} pages in Chromium…`);
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  userAgent: "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36 (compatible; Googlebot/2.1)",
  viewport: { width: 412, height: 915 },
});
await pool(queue, CONCURRENCY, (u) => auditPage(ctx, u, robots, sitemapSet.has(u)).catch((e) => add("ERROR", u, "audit-crash", e.message)));

// Seeds not in sitemap: informational (is that intentional?)
for (const s of seeds) {
  const r = results.find((x) => x.url === s);
  if (r && r.indexable && !sitemapSet.has(s)) add("WARN", s, "indexable-not-in-sitemap", "Indexable page is missing from the sitemap");
}

// Broken internal links (check unique link targets not already rendered, capped)
const rendered = new Set(results.map((r) => r.url.replace(/\/$/, "")));
const toCheck = [...linkGraph].filter((l) => !rendered.has(l) && !/\.(png|jpe?g|gif|webp|svg|ico|css|js)$/i.test(l) && !l.includes("/api/")).slice(0, 250);
console.log(`  checking ${toCheck.length} extra internal link targets…`);
const sources = new Map();
for (const r of results) for (const l of r.internal) if (!sources.has(l.replace(/\/$/, ""))) sources.set(l.replace(/\/$/, ""), r.url);
await pool(toCheck, 8, async (l) => {
  let r = await get(l, { method: "HEAD" });
  if (r.status === 405 || r.status === 501 || r.status === 0) r = await get(l);
  if (r.status >= 400 || r.status === 0) add("ERROR", sources.get(l) || l, "broken-link", `Link to ${l} -> ${r.status}`);
  else if (r.status >= 300) add("WARN", sources.get(l) || l, "link-redirects", `Link to ${l} redirects (${r.status}); link to the final URL`);
});

// Orphans: sitemap URLs in the rendered sample that nothing links to (weak internal linking)
if (ALL || picked.length === sitemapUrls.size) {
  for (const u of sitemapUrls.keys()) if (!linkGraph.has(u.replace(/\/$/, "")) && u.replace(/\/$/, "") !== BASE) add("WARN", u, "orphan", "In sitemap but no crawled page links to it");
}

// Duplicates
for (const [t, urls] of seen.titles) if (urls.length > 1) add("WARN", urls[0], "title-duplicate", `Same title on ${urls.length} pages: "${t}" (e.g. ${urls.slice(0, 3).join(", ")})`);
for (const urls of seen.descs.values()) if (urls.length > 1) add("WARN", urls[0], "desc-duplicate", `Same description on ${urls.length} pages (e.g. ${urls.slice(0, 3).join(", ")})`);

await browser.close();

/* ---------------- report ---------------- */
const errors = issues.filter((i) => i.sev === "ERROR");
const warns = issues.filter((i) => i.sev === "WARN");
const byCode = (list) => {
  const m = new Map();
  for (const i of list) {
    if (!m.has(i.code)) m.set(i.code, []);
    m.get(i.code).push(i);
  }
  return m;
};
const print = (label, list) => {
  if (!list.length) return;
  console.log(`\n${label} (${list.length})`);
  for (const [code, items] of byCode(list)) {
    console.log(`  ${code}  ×${items.length}`);
    for (const i of items.slice(0, 5)) console.log(`     - ${i.url}\n       ${i.msg}`);
    if (items.length > 5) console.log(`     … and ${items.length - 5} more (see seo-audit-report.json)`);
  }
};
print("ERRORS — fix before deploying", errors);
print("WARNINGS — likely to hurt indexing / CTR", warns);
fs.writeFileSync("seo-audit-report.json", JSON.stringify({ base: BASE, date: new Date().toISOString(), pagesRendered: results.length, sitemapUrls: sitemapUrls.size, issues }, null, 2));
console.log(`\nAudited ${results.length} pages, ${sitemapUrls.size} sitemap URLs in ${((Date.now() - t0) / 1000).toFixed(0)}s: ${errors.length} errors, ${warns.length} warnings. Report: seo-audit-report.json`);
process.exit(errors.length ? 1 : 0);
