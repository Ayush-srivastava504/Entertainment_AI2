/*
IndexNow ping (Bing / Yandex / Seznam / Naver) for new or changed pages.
Google ignores IndexNow and discovers pages through the sitemap.

Accepts site-relative paths ("/ending-explained/x") or absolute URLs.
Dedupes, batches (IndexNow allows 10,000 URLs per request), logs the HTTP
status and never throws: an indexing ping must not fail a crawl run.
*/
const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://marquees.site").replace(/^(https?:\/\/)www\./, "$1").replace(/\/$/, "");
const BATCH = 9000;

export async function pingIndexNow(paths) {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    if (paths?.length) console.log("[indexnow] INDEXNOW_KEY not set, skipping.");
    return { submitted: 0 };
  }
  const urls = [...new Set((paths ?? []).filter(Boolean).map((p) => (/^https?:\/\//.test(p) ? p : `${BASE}${p}`)))];
  if (!urls.length) return { submitted: 0 };

  let submitted = 0;
  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    try {
      const res = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ host: new URL(BASE).host, key, keyLocation: `${BASE}/${key}.txt`, urlList: batch }),
      });
      // 200 = accepted, 202 = accepted pending key validation.
      if (res.status === 200 || res.status === 202) submitted += batch.length;
      else console.warn(`[indexnow] batch rejected: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    } catch (err) {
      console.warn(`[indexnow] skipped batch: ${err.message}`);
    }
  }
  console.log(`[indexnow] submitted ${submitted}/${urls.length} url(s)`);
  return { submitted };
}
