/*
One-off / occasional bulk IndexNow submit: reads the live sitemap index,
collects every URL and submits them all to IndexNow (Bing, Yandex, Seznam,
Naver). Run once after fixing the key file, then again whenever you want to
push everything:

  INDEXNOW_KEY=yourkey node crawler/indexnow-bulk.mjs
  INDEXNOW_KEY=yourkey node crawler/indexnow-bulk.mjs --dry
  INDEXNOW_KEY=yourkey node crawler/indexnow-bulk.mjs --since-hours=36   # only URLs whose <lastmod> is recent

Before running, confirm https://marquees.site/<INDEXNOW_KEY>.txt returns the
key (the INDEXNOW_KEY env var must ALSO be set on Vercel, not only in
GitHub Actions, or that file 404s and IndexNow rejects every submission).
*/
const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://marquees.site")
  .replace(/^(https?:\/\/)www\./, "$1")
  .replace(/\/$/, "");
const KEY = process.env.INDEXNOW_KEY;
const DRY = process.argv.includes("--dry");
const sinceArg = process.argv.find((a) => a.startsWith("--since-hours="));
const SINCE = sinceArg ? Date.now() - Number(sinceArg.split("=")[1]) * 3600_000 : 0;

const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": "marquee-indexnow-bulk/1.0" } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

if (!KEY) {
  console.error("INDEXNOW_KEY is not set.");
  process.exit(1);
}

const keyRes = await fetch(`${BASE}/${KEY}.txt`);
const keyBody = keyRes.ok ? (await keyRes.text()).trim() : "";
if (keyBody !== KEY) {
  console.error(`Key file check FAILED: ${BASE}/${KEY}.txt returned HTTP ${keyRes.status}. Set INDEXNOW_KEY on Vercel and redeploy.`);
  process.exit(1);
}
console.log("Key file OK.");

const sitemaps = locs(await get(`${BASE}/sitemap.xml`));
const urls = new Set();
for (const sm of sitemaps) {
  const xml = await get(sm);
  // Walk <url> blocks so --since-hours can compare each URL's <lastmod>.
  for (const [, block] of xml.matchAll(/<url>(.*?)<\/url>/g)) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.replace(/&amp;/g, "&");
    const lm = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
    if (!loc) continue;
    if (SINCE && lm && new Date(lm).getTime() < SINCE) continue;
    urls.add(loc);
  }
}
const all = [...urls];
console.log(`Collected ${all.length} URLs from ${sitemaps.length} sitemaps${SINCE ? ` (lastmod within ${sinceArg.split("=")[1]}h)` : ""}.`);
if (all.length === 0) process.exit(0);
if (DRY) process.exit(0);

for (let i = 0; i < all.length; i += 9000) {
  const batch = all.slice(i, i + 9000);
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(BASE).host, key: KEY, keyLocation: `${BASE}/${KEY}.txt`, urlList: batch }),
  });
  console.log(`Batch ${i / 9000 + 1}: ${batch.length} URLs -> HTTP ${res.status}${res.status === 200 || res.status === 202 ? "" : " (NOT accepted)"}`);
}
