/*
Handlers for URLs from the old site (TMDB/Jikan movie + anime list pages:
/movies/*, /anime/*, /genres/*, /rankings/*). Those pages no longer exist and
should leave Google's index.

 - 410 Gone is a stronger "drop this" signal than 404 and Google acts on it
   faster, which is what clears "Discovered - currently not indexed".
 - If an old /movies/<slug> or /anime/<slug> matches a guide that IS
   published now, send a permanent redirect to that guide instead.

IMPORTANT: never Disallow these paths in robots.txt. Google can only see a
410 by crawling the URL; a robots block leaves them stuck in the report.
*/
import { getPublishedMovieBySlugOrId } from "@/lib/api/movies";
import { getPublishedAnimeBySlugOrId } from "@/lib/api/anime";
import { getBaseUrl } from "@/lib/site";

const GONE_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "public, max-age=0, s-maxage=86400",
  "X-Robots-Tag": "noindex",
};

export function gone() {
  return new Response("410 Gone: this page has been permanently removed.", { status: 410, headers: GONE_HEADERS });
}

export async function legacyTitle(kind: "movie" | "anime", path?: string[]) {
  const slug = path?.[0];
  if (slug && path!.length === 1) {
    let hit;
    try {
      hit =
        kind === "movie"
          ? (await getPublishedMovieBySlugOrId(slug))?.movie
          : (await getPublishedAnimeBySlugOrId(slug))?.anime;
    } catch {
      // DB unavailable: say "try later" rather than a 410 Google would act on.
      return new Response("Temporarily unavailable", { status: 503, headers: { "Retry-After": "300" } });
    }
    if (hit) {
      return new Response(null, {
        status: 301,
        headers: { Location: `${getBaseUrl()}/ending-explained/${hit.slug}` },
      });
    }
  }
  return gone();
}
