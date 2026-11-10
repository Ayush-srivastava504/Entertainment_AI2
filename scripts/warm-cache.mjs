#!/usr/bin/env node
/*
Warm the ISR cache after a deploy.

Every Vercel deploy starts with an empty ISR cache, and the dynamic pages
(ending-explained, watch-order, characters, gifs, ...) are built on first
visit. If Googlebot is the first visitor it gets ~1,000 cold renders that
each hit Postgres, which is slow and can 500 under parallel load -- and
Google throttles its crawl rate for a slow/erroring host. This fetches every
sitemap URL once, gently (low concurrency), so crawlers hit cached pages.

  npm run warm-cache                                  # https://animegirl4u.com
  npm run warm-cache -- --base=https://preview.vercel.app --concurrency=2
*/

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=")[1] || d;
const BASE = arg("base", process.env.SITE_URL || "https://animegirl4u.com").replace(/\/$/, "");
const CONCURRENCY = Number(arg("concurrency", "3"));
const UA = "animegirl4u-cache-warmer/1.0";

const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const get = async (url, tries = 3) => {
  for (let t = 1; ; t++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA } });
      await r.arrayBuffer();
      if (r.status < 500 || t >= tries) return r.status;
    } catch (e) {
      if (t >= tries) return `ERR ${e.message}`;
    }
    await new Promise((r) => setTimeout(r, 1000 * t));
  }
};

const index = await (await fetch(`${BASE}/sitemap.xml`, { headers: { "user-agent": UA } })).text();
// Child sitemap URLs are absolute production URLs; re-point them at BASE.
const children = locs(index).map((u) => BASE + new URL(u).pathname);
const urls = [];
for (const s of children) {
  const xml = await (await fetch(s, { headers: { "user-agent": UA } })).text();
  urls.push(...locs(xml).map((u) => BASE + new URL(u).pathname));
}

console.log(`Warming ${urls.length} URLs from ${children.length} sitemaps on ${BASE} (concurrency ${CONCURRENCY})`);
const failed = [];
let i = 0, done = 0;
const t0 = Date.now();
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (i < urls.length) {
      const u = urls[i++];
      const status = await get(u);
      if (status !== 200) failed.push(`${status} ${u}`);
      if (++done % 100 === 0) console.log(`  ${done}/${urls.length}`);
    }
  })
);
console.log(`Done in ${Math.round((Date.now() - t0) / 1000)}s. Non-200: ${failed.length}`);
failed.slice(0, 50).forEach((f) => console.log("  " + f));
process.exit(failed.some((f) => /^(5|ERR)/.test(f)) ? 1 : 0);
