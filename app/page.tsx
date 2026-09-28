import Link from "next/link";
import { getRecentPublishedMovies } from "@/lib/api/movies";
import { getRecentPublishedAnime } from "@/lib/api/anime";
import { getFeaturedFranchises } from "@/lib/api/franchises";
import { MediaGrid } from "@/components/media/MediaGrid";

export default async function HomePage() {
  const [movies, anime, franchises] = await Promise.all([
    getRecentPublishedMovies(6),
    getRecentPublishedAnime(6),
    getFeaturedFranchises(6),
  ]);

  const latestGuides = [...movies, ...anime]
    .sort((a, b) => {
      const at = a.endingExplainedPublishedAt ? new Date(a.endingExplainedPublishedAt).getTime() : 0;
      const bt = b.endingExplainedPublishedAt ? new Date(b.endingExplainedPublishedAt).getTime() : 0;
      return bt - at;
    })
    .slice(0, 6);

  return (
    <>
      <section className="relative overflow-hidden border-b border-marquee-line">
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-16">
          <div className="bulb-row mb-6" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className="bulb" style={{ animationDelay: `${i * 0.18}s` }} />
            ))}
          </div>
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl leading-[0.95] text-marquee-text tracking-wide">
            NOW SHOWING:
            <br />
            <span className="text-marquee-gold">EVERY ENDING, EXPLAINED</span>
          </h1>
          <p className="mt-6 max-w-xl text-marquee-textDim text-lg">
            Spoiler-forward breakdowns of how movies and anime actually end, plus the right order
            to watch every franchise.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/ending-explained"
              className="rounded bg-marquee-gold px-6 py-3 font-semibold text-marquee-bg hover:bg-marquee-amber transition focus-ring"
            >
              Browse Ending Explained
            </Link>
            <Link
              href="/watch-order"
              className="rounded border border-marquee-line px-6 py-3 font-semibold text-marquee-text hover:border-marquee-gold transition focus-ring"
            >
              Browse Watch Order
            </Link>
          </div>
        </div>
      </section>

      {latestGuides.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-3xl text-marquee-text">Latest Ending Explained</h2>
            <Link href="/ending-explained" className="text-sm text-marquee-gold hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-8">
            <MediaGrid items={latestGuides} basePath="/ending-explained" />
          </div>
        </section>
      )}

      {franchises.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-3xl text-marquee-text">Featured Watch Orders</h2>
            <Link href="/watch-order" className="text-sm text-marquee-gold hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {franchises.map((f) => (
              <Link
                key={f.id}
                href={`/watch-order/${f.slug}`}
                className="ticket block p-5 pl-8 transition hover:border-marquee-gold"
              >
                <h3 className="font-display text-2xl text-marquee-text">{f.title}</h3>
                {f.intro && <p className="mt-2 text-sm text-marquee-textDim line-clamp-3">{f.intro}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
