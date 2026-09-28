import Link from "next/link";
import { getBaseUrl } from "@/lib/site";
import { getRecentPublishedMovies } from "@/lib/api/movies";
import { getRecentPublishedAnime } from "@/lib/api/anime";
import { MediaGrid } from "@/components/media/MediaGrid";
import { SearchBar } from "@/components/media/SearchBar";
import { PageHero } from "@/components/ui/PageHero";
import { Faq } from "@/components/ui/Faq";
import { CtaBand } from "@/components/ui/CtaBand";
import { ENDING_INDEX_FAQ } from "@/lib/faq";

const BASE_URL = getBaseUrl();

export const metadata = {
  title: "Ending Explained Guides | Marquee",
  description: "Spoiler-forward breakdowns of how your favorite movies and anime actually end.",
  alternates: { canonical: `${BASE_URL}/ending-explained` },
};

const filters = [
  { key: "all", label: "All" },
  { key: "movie", label: "Movies" },
  { key: "anime", label: "Anime" },
] as const;

export default async function EndingExplainedIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const active = type === "movie" || type === "anime" ? type : "all";

  const [movies, anime] = await Promise.all([getRecentPublishedMovies(60), getRecentPublishedAnime(60)]);

  const items = [...(active === "anime" ? [] : movies), ...(active === "movie" ? [] : anime)].sort((a, b) => {
    const at = a.endingExplainedPublishedAt ? new Date(a.endingExplainedPublishedAt).getTime() : 0;
    const bt = b.endingExplainedPublishedAt ? new Date(b.endingExplainedPublishedAt).getTime() : 0;
    return bt - at;
  });

  return (
    <>
      <PageHero
        kicker="Ending explained"
        title="Every ending, actually explained"
        subtitle="How movies and anime end: a recap, the ending itself, what it means, and the questions people search for most."
      >
        <SearchBar path="/search" />
      </PageHero>

      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Filter guides">
          {filters.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/ending-explained" : `/ending-explained?type=${f.key}`}
              aria-current={active === f.key ? "true" : undefined}
              className={`rounded-full border-2 border-ink px-5 py-2 font-bold transition ${
                active === f.key ? "bg-ink text-white" : "bg-surface hover:bg-tape"
              }`}
            >
              {f.label}
            </Link>
          ))}
          <p className="ml-auto text-sm font-semibold text-muted">{items.length} guides</p>
        </div>

        {items.length === 0 ? (
          <div className="mt-10 rounded-2xl border-2 border-ink bg-surface p-8">
            <p className="font-display text-2xl font-bold">No guides here yet</p>
            <p className="mt-2 font-body text-muted">
              Try another filter, or{" "}
              <Link href="/watch-order" className="font-semibold text-beam underline">
                browse watch order guides
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="mt-8">
            <MediaGrid items={items} basePath="/ending-explained" />
          </div>
        )}

        <div className="mt-24">
          <Faq items={ENDING_INDEX_FAQ} title="Using the ending explained guides" />
        </div>
      </div>

      <CtaBand
        title="Starting a franchise?"
        text="Read its watch order first, then come back for each ending."
        primary={{ href: "/watch-order", label: "Browse watch orders" }}
        secondary={{ href: "/search", label: "Search by title" }}
      />
    </>
  );
}
