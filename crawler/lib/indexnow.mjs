/*
Best-effort IndexNow ping (Bing/Yandex/Seznam/Naver) for freshly published
pages. Google ignores IndexNow and discovers pages through the sitemap.
Never throws: indexing pings must not fail a generation run.
*/
const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://marquees.site").replace(/^(https?:\/\/)www\./, "$1").replace(/\/$/, "");

export async function pingIndexNow(paths) {
  const key = process.env.INDEXNOW_KEY;
  if (!key || !paths.length) return;
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(BASE).host,
        key,
        keyLocation: `${BASE}/${key}.txt`,
        urlList: paths.map((p) => `${BASE}${p}`),
      }),
    });
    console.log(`[indexnow] submitted ${paths.length} url(s): HTTP ${res.status}`);
  } catch (err) {
    console.warn(`[indexnow] skipped: ${err.message}`);
  }
}
