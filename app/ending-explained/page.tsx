import Link from "next/link";
import { getBaseUrl } from "@/lib/site";
import { getRecentPublishedMovies } from "@/lib/api/movies";
import { getRecentPublishedAnime } from "@/lib/api/anime";
import { MediaGrid } from "@/components/media/MediaGrid";

const BASE_URL = getBaseUrl();

export const metadata = {
  title: "Ending Explained Guides | Marquees",
  description: "Spoiler-forward breakdowns of how your favorite movies and anime actually end.",
  alternates: { canonical: `${BASE_URL}/ending-explained` },
};

export default async function EndingExplainedIndexPage() {
  const [movies, anime] = await Promise.all([
    getRecentPublishedMovies(60),
    getRecentPublishedAnime(60),
  ]);

  const items = [...movies, ...anime].sort((a, b) => {
    const at = a.endingExplainedPublishedAt ? new Date(a.endingExplainedPublishedAt).getTime() : 0;
    const bt = b.endingExplainedPublishedAt ? new Date(b.endingExplainedPublishedAt).getTime() : 0;
    return bt - at;
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">📖 ENDING EXPLAINED</p>
      <h1 className="mt-3 font-display text-3xl sm:text-5xl text-marquee-text">
        Every ending, actually explained
      </h1>
      <p className="mt-4 max-w-2xl text-marquee-textDim">
        Spoiler-forward breakdowns of how movies and anime end — recap, the ending itself, what it
        means, and the questions people search for most.
      </p>

      {items.length === 0 ? (
        <p className="mt-10 text-marquee-textDim">No guides published yet — check back soon.</p>
      ) : (
        <div className="mt-10">
          <MediaGrid items={items} basePath="/ending-explained" />
        </div>
      )}

      <p className="mt-12 text-sm text-marquee-textDim">
        Starting a franchise and not sure where to begin?{" "}
        <Link href="/watch-order" className="text-marquee-gold hover:underline">
          Browse Watch Order guides
        </Link>{" "}
        or <Link href="/search" className="text-marquee-gold hover:underline">search by title</Link>.
      </p>
    </div>
  );
}
