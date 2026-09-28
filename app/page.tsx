import Link from "next/link";
import { getRecentPublishedMovies } from "@/lib/api/movies";
import { getRecentPublishedAnime } from "@/lib/api/anime";
import { getFeaturedFranchises } from "@/lib/api/franchises";
import { MediaGrid } from "@/components/media/MediaGrid";
import { SearchBar } from "@/components/media/SearchBar";
import { Faq } from "@/components/ui/Faq";
import { CtaBand } from "@/components/ui/CtaBand";
import { HOME_FAQ } from "@/lib/faq";

const steps = [
  { title: "Search the title", text: "Type the movie, anime or franchise you just watched or want to start." },
  { title: "Read the guide", text: "Get a recap, the ending itself, what it means, and answers to the usual questions." },
  { title: "Watch in the right order", text: "Follow the franchise's watch order so nothing is spoiled or missed." },
];

export default async function HomePage() {
  const [movies, anime, franchises] = await Promise.all([
    getRecentPublishedMovies(8),
    getRecentPublishedAnime(8),
    getFeaturedFranchises(6),
  ]);

  const latestGuides = [...movies, ...anime]
    .sort((a, b) => {
      const at = a.endingExplainedPublishedAt ? new Date(a.endingExplainedPublishedAt).getTime() : 0;
      const bt = b.endingExplainedPublishedAt ? new Date(b.endingExplainedPublishedAt).getTime() : 0;
      return bt - at;
    })
    .slice(0, 8);

  const spotlight = latestGuides[0];

  return (
    <>
      <section className="overflow-hidden border-b-2 border-ink bg-beam text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 sm:py-24 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <h1 className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl">
              Finished it and still confused?
            </h1>
            <p className="mt-6 max-w-xl font-body text-xl leading-relaxed text-white/90">
              Plain-English endings for movies and anime, plus the right order to watch every franchise.
            </p>
            <div className="mt-9 max-w-xl">
              <SearchBar path="/search" size="lg" />
            </div>
            <p className="mt-5 text-base text-white/80">
              Or browse{" "}
              <Link href="/ending-explained" className="font-bold text-tape underline underline-offset-4">
                all ending explained guides
              </Link>{" "}
              and{" "}
              <Link href="/watch-order" className="font-bold text-tape underline underline-offset-4">
                watch orders
              </Link>
              .
            </p>
          </div>

          {spotlight && (
            <Link
              href={`/ending-explained/${spotlight.slug}`}
              className="group mx-auto block w-full max-w-sm rotate-2 rounded-2xl border-2 border-ink bg-surface text-ink shadow-block transition hover:rotate-0"
            >
              <div className="slate-stripes rounded-t-[14px]" aria-hidden="true" />
              <div className="p-5">
                <p className="text-sm font-semibold text-muted">Newest guide</p>
                <div className="mt-3 flex gap-4">
                  {spotlight.posterUrl && (
                    <img
                      src={spotlight.posterUrl}
                      alt={`${spotlight.title} poster`}
                      className="h-36 w-24 shrink-0 rounded-lg border-2 border-ink object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-display text-2xl font-extrabold leading-tight group-hover:text-beam">
                      {spotlight.title} ending explained
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      {[spotlight.kind === "anime" ? "Anime" : "Movie", spotlight.year].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>

      {latestGuides.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-4xl font-extrabold tracking-tight">Latest endings explained</h2>
            <Link href="/ending-explained" className="rounded-full border-2 border-ink px-5 py-2 font-bold hover:bg-tape">
              See all guides
            </Link>
          </div>
          <div className="mt-8">
            <MediaGrid items={latestGuides} basePath="/ending-explained" />
          </div>
        </section>
      )}

      <section className="border-y-2 border-ink bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-4xl font-extrabold tracking-tight">How Marquee works</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border-2 border-ink bg-paper p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink bg-tape font-display text-lg font-extrabold">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-display text-2xl font-bold">{s.title}</h3>
                <p className="mt-2 font-body text-base leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {franchises.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-4xl font-extrabold tracking-tight">Watch order guides</h2>
            <Link href="/watch-order" className="rounded-full border-2 border-ink px-5 py-2 font-bold hover:bg-tape">
              See all watch orders
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {franchises.map((f) => (
              <Link
                key={f.id}
                href={`/watch-order/${f.slug}`}
                className="group flex flex-col rounded-2xl border-2 border-ink bg-surface p-6 transition hover:-translate-y-1 hover:shadow-block"
              >
                <h3 className="font-display text-2xl font-extrabold leading-tight group-hover:text-beam">
                  {f.title} watch order
                </h3>
                {f.intro && <p className="mt-3 line-clamp-3 font-body text-base leading-relaxed text-muted">{f.intro}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 className="font-display text-4xl font-extrabold tracking-tight">Questions, answered</h2>
            <p className="mt-4 max-w-sm font-body text-lg text-muted">
              What the guides are, how they are made, and what to expect.
            </p>
          </div>
          <Faq items={HOME_FAQ} title="About the guides" id="faq" />
        </div>
      </section>

      <CtaBand
        title="Not sure what to read first?"
        text="Search by title, or start with a franchise's watch order and read each ending as you go."
        primary={{ href: "/search", label: "Search guides" }}
        secondary={{ href: "/watch-order", label: "Browse watch orders" }}
      />
    </>
  );
}
