/*
Submits changed URLs to IndexNow (https://www.indexnow.org) so Bing,
Yandex, Seznam and Naver pick up new/updated Ending Explained and Watch
Order guides right away. Google doesn't participate in IndexNow — the
sitemap (app/sitemap.ts) remains its discovery path.

Needs INDEXNOW_KEY (any random 8-128 char alphanumeric string). The same
value is served at https://<domain>/<INDEXNOW_KEY>.txt by app/[key]/route.ts.
No-ops quietly when the key isn't set: IndexNow is best-effort and must
never make a revalidation request fail.
*/

import { getBaseUrl } from "@/lib/site";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_URLS_PER_SUBMISSION = 10_000;

export interface IndexNowResult {
  submitted: number;
  skipped?: string;
}

export async function submitToIndexNow(urls: string[]): Promise<IndexNowResult> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return { submitted: 0, skipped: "INDEXNOW_KEY is not set" };
  if (urls.length === 0) return { submitted: 0 };

  const baseUrl = getBaseUrl();
  const urlList = urls.slice(0, MAX_URLS_PER_SUBMISSION);

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(baseUrl).host,
        key,
        keyLocation: `${baseUrl}/${key}.txt`,
        urlList,
      }),
    });
    // 200 = accepted, 202 = accepted pending key validation.
    if (res.status !== 200 && res.status !== 202) {
      console.error(`IndexNow submission failed: ${res.status}`);
      return { submitted: 0, skipped: `IndexNow responded ${res.status}` };
    }
    return { submitted: urlList.length };
  } catch (err) {
    console.error("IndexNow submission failed:", err);
    return { submitted: 0, skipped: err instanceof Error ? err.message : "unknown error" };
  }
}
