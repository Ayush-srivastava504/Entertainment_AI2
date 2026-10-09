import type { Metadata } from "next";
import Link from "next/link";
import { getRecentPublishedMovies } from "@/lib/api/movies";
import { getRecentPublishedAnime } from "@/lib/api/anime";
import { getAllPublishedFranchises, getFeaturedFranchises } from "@/lib/api/franchises";
import { getHubCounts, getTopRatedGuides, type GuideLink } from "@/lib/api/hub";
import { ENDING_TOPICS, WATCH_ORDER_TOPICS } from "@/lib/topics";
import { MediaGrid } from "@/components/media/MediaGrid";
import { SearchBar } from "@/components/media/SearchBar";
import { Faq } from "@/components/ui/Faq";
import { CtaBand } from "@/components/ui/CtaBand";
import { TitleRequestForm } from "@/components/TitleRequestForm";
import { HOME_FAQ } from "@/lib/faq";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { buildOgImageUrl } from "@/lib/og";
import { preload } from "react-dom";
import { posterSrc, posterSrcSet } from "@/lib/image";
import { graph, jsonLdString, ORG_ID, WEBSITE_ID } from "@/lib/jsonld";

export const revalidate = 3600;

const BASE_URL = getBaseUrl();

const TITLE = `${SITE_NAME}: Movie & Anime Endings Explained, Plus Watch Order Guides`;
const DESCRIPTION =
  "Finished a movie or anime and still confused? Read plain-English ending explained guides, then follow the right watch order for every franchise. Spoilers stay hidden until you choose.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: BASE_URL },
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: buildOgImageUrl({ title: SITE_NAME, subtitle: "Endings explained. Franchises in order.", badge: "MARQUEE" }),
        width: 1200,
        height: 630,
        alt: `${SITE_NAME}: endings explained and franchise watch orders`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const steps = [
  { title: "Search the title", text: "Type the movie, anime or franchise you just finished, or the one you are about to start." },
  { title: "Read the guide", text: "Get a spoiler-light recap first, then the ending itself, what it means, and answers to the usual questions." },
  { title: "Watch in the right order", text: "Follow the franchise watch order so no reveal is spoiled and no entry is missed." },
];

const promises = [
  { title: "Spoilers on your terms", text: "The ending sits behind a reveal control. Read the recap, stop, or go all the way." },
  { title: "Facts apart from theories", text: "Guides separate what the story shows from what viewers read into it, so open endings are never dressed up as settled." },
  { title: "Reviewed watch orders", text: "A wrong order can spoil a first watch, so every watch order waits for human approval before it goes live." },
];

const quotes = [
  "A good ending answers one question and quietly asks another.",
  "The last scene is where the first scene finally makes sense.",
  "Some stories end on the screen and finish in the conversation afterwards.",
];

const popularSearches = ["Attack on Titan", "Interstellar", "Jujutsu Kaisen", "Oppenheimer", "Chainsaw Man", "Dune: Part Two"];

export default async function HomePage() {
  const [movies, anime, franchises, topMovies, topAnime, counts, allFranchises] = await Promise.all([
    getRecentPublishedMovies(8),
    getRecentPublishedAnime(8),
    getFeaturedFranchises(6),
    getTopRatedGuides("movie", 8),
    getTopRatedGuides("anime", 8),
    getHubCounts(),
    getAllPublishedFranchises(60),
  ]);

  // Hero chips link straight to real guides (indexable, crawlable). /search is
  // blocked in robots.txt, so search links pass no link equity; they are only
  // the fallback while the catalog is empty.
  const popularGuides = [...topMovies.slice(0, 3), ...topAnime.slice(0, 3)];
  const moreFranchises = allFranchises.filter((f) => !franchises.some((x) => x.slug === f.slug)).slice(0, 24);
  const browseCards = [
    {
      href: "/ending-explained",
      kicker: "After you watch",
      title: "Movie endings explained",
      text: "Recap, ending and meaning for films that left you with questions.",
      count: counts.movies,
      unit: "movie guides",
    },
    {
      href: "/ending-explained/topic/anime-finales",
      kicker: "After the finale",
      title: "Anime finales explained",
      text: "What the last episode meant, who survived, and what stayed open.",
      count: counts.anime,
      unit: "anime guides",
    },
    {
      href: "/watch-order",
      kicker: "Before you start",
      title: "Franchise watch orders",
      text: "Release, story and recommended order for movie and anime franchises.",
      count: counts.franchises,
      unit: "watch orders",
    },
  ];

  const latestGuides = [...movies, ...anime]
    .sort((a, b) => {
      const at = a.endingExplainedPublishedAt ? new Date(a.endingExplainedPublishedAt).getTime() : 0;
      const bt = b.endingExplainedPublishedAt ? new Date(b.endingExplainedPublishedAt).getTime() : 0;
      return bt - at;
    })
    .slice(0, 8);

  const spotlight = latestGuides[0];

  // The spotlight poster is the largest element in the first mobile screen
  // (the LCP element). Preloading starts its download from the document head
  // instead of waiting for the parser to reach the card.
  const spotlightSrc = posterSrc(spotlight?.posterUrl, 185);
  if (spotlightSrc) preload(spotlightSrc, { as: "image", fetchPriority: "high" });

  const pageJsonLd = graph(
    {
      "@type": "WebPage",
      "@id": `${BASE_URL}/#webpage`,
      url: BASE_URL,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORG_ID },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: `${BASE_URL}${buildOgImageUrl({ title: SITE_NAME, subtitle: "Endings explained. Franchises in order.", badge: "MARQUEE" })}`,
        width: 1200,
        height: 630,
      },
    },
    ...(latestGuides.length > 0
      ? [
          {
            "@type": "ItemList",
            name: "Latest endings explained",
            itemListOrder: "https://schema.org/ItemListOrderDescending",
            numberOfItems: latestGuides.length,
            itemListElement: latestGuides.map((g, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${BASE_URL}/ending-explained/${g.slug}`,
              name: `${g.title} ending explained`,
            })),
          },
        ]
      : []),
    ...(franchises.length > 0
      ? [
          {
            "@type": "ItemList",
            name: "Featured watch orders",
            numberOfItems: franchises.length,
            itemListElement: franchises.map((f, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${BASE_URL}/watch-order/${f.slug}`,
              name: `${f.title} watch order`,
            })),
          },
        ]
      : [])
  );

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdString(pageJsonLd) }}
      />

      <section className="overflow-hidden border-b-2 border-ink bg-beam text-white" aria-labelledby="home-heading">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[1.25fr_1fr] lg:gap-12">
          <div>
            <p className="inline-block rounded-full bg-tape px-3 py-1 text-sm font-bold text-ink">
              Movies and anime, explained
            </p>
            <h1
              id="home-heading"
              className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
            >
              Finished it and still confused?
            </h1>
            <p className="mt-5 max-w-xl font-body text-lg leading-relaxed text-white/90 sm:text-xl">
              Plain-English ending explained guides for movies and anime, plus the right watch order for every
              franchise. Spoilers stay hidden until you say so.
            </p>
            <div className="mt-8 max-w-xl">
              <SearchBar path="/search" size="lg" />
            </div>
            <nav className="mt-5 max-w-xl" aria-label={popularGuides.length ? "Popular guides" : "Popular title searches"}>
              <p className="mb-2 text-sm font-bold text-white/80">{popularGuides.length ? "Popular guides" : "Popular searches"}</p>
              <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                {(popularGuides.length
                  ? popularGuides.map((g) => ({ key: `${g.kind}-${g.slug}`, label: g.title, href: `/ending-explained/${g.slug}` }))
                  : popularSearches.map((t) => ({ key: t, label: t, href: `/search?q=${encodeURIComponent(t)}` }))
                ).map((c) => (
                  <li key={c.key} className="shrink-0">
                    <Link
                      href={c.href}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-tape hover:bg-tape hover:text-ink"
                    >
                      <span aria-hidden="true" className="text-tape">★</span>
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <p className="mt-5 text-base text-white/85">
              Or browse{" "}
              <Link href="/ending-explained" className="font-bold text-tape underline underline-offset-4">
                all ending explained guides
              </Link>{" "}
              and{" "}
              <Link href="/watch-order" className="font-bold text-tape underline underline-offset-4">
                watch order guides
              </Link>
              .
            </p>
          </div>

          {spotlight && (
            <Link
              href={`/ending-explained/${spotlight.slug}`}
              className="group mx-auto block w-full max-w-sm rounded-2xl border-2 border-ink bg-surface text-ink shadow-block transition sm:rotate-2 sm:hover:rotate-0"
            >
              <div className="slate-stripes rounded-t-[14px]" aria-hidden="true" />
              <div className="p-5">
                <p className="text-sm font-semibold text-muted">Newest guide</p>
                <div className="mt-3 flex gap-4">
                  {spotlight.posterUrl && (
                    <img
                      src={posterSrc(spotlight.posterUrl, 185)}
                      srcSet={posterSrcSet(spotlight.posterUrl)}
                      sizes="96px"
                      alt={`${spotlight.title} poster`}
                      width={96}
                      height={144}
                      decoding="async"
                      fetchPriority="high"
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

      <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-16" aria-labelledby="browse-heading">
        <p className="text-sm font-bold uppercase text-beam">Start here</p>
        <h2 id="browse-heading" className="mt-2 max-w-3xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Browse Marquee by what you need
        </h2>
        <ul className="mt-8 grid gap-5 md:grid-cols-3">
          {browseCards.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                className="group flex h-full flex-col rounded-2xl border-2 border-ink bg-surface p-6 transition hover:-translate-y-1 hover:shadow-block"
              >
                <span className="text-sm font-bold uppercase text-beam">{c.kicker}</span>
                <span className="mt-2 font-display text-2xl font-extrabold leading-tight group-hover:text-beam">{c.title}</span>
                <span className="mt-2 font-body text-base leading-relaxed text-muted">{c.text}</span>
                <span className="mt-auto pt-4 text-sm font-bold">
                  {c.count > 0 ? `${c.count.toLocaleString("en-US")} ${c.unit}` : "Browse the collection"}
                  <span aria-hidden="true"> →</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-16" aria-labelledby="topics-heading">
        <h2 id="topics-heading" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Find a guide by topic
        </h2>
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div>
            <h3 className="font-display text-xl font-bold">Ending explained collections</h3>
            <ul className="mt-4 grid gap-3">
              {ENDING_TOPICS.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/ending-explained/topic/${t.slug}`}
                    className="group block rounded-xl border-2 border-ink bg-surface px-4 py-3 transition hover:bg-tape"
                  >
                    <span className="block font-display text-lg font-bold">{t.title}</span>
                    <span className="mt-0.5 block font-body text-sm leading-snug text-muted group-hover:text-ink">{t.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-xl font-bold">Watch order collections</h3>
            <ul className="mt-4 grid gap-3">
              {WATCH_ORDER_TOPICS.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/watch-order/topic/${t.slug}`}
                    className="group block rounded-xl border-2 border-ink bg-surface px-4 py-3 transition hover:bg-tape"
                  >
                    <span className="block font-display text-lg font-bold">{t.title}</span>
                    <span className="mt-0.5 block font-body text-sm leading-snug text-muted group-hover:text-ink">{t.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {(topMovies.length > 0 || topAnime.length > 0) && (
        <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-16" aria-labelledby="top-heading">
          <h2 id="top-heading" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Top-rated endings explained
          </h2>
          <div className="mt-8 grid gap-10 md:grid-cols-2">
            {([
              ["Movies", topMovies],
              ["Anime", topAnime],
            ] as [string, GuideLink[]][]).map(([label, list]) =>
              list.length > 0 ? (
                <div key={label}>
                  <h3 className="font-display text-xl font-bold">{label}</h3>
                  <ol className="mt-4 divide-y-2 divide-ink overflow-hidden rounded-2xl border-2 border-ink bg-surface">
                    {list.map((g, i) => (
                      <li key={`${g.kind}-${g.slug}`}>
                        <Link
                          href={`/ending-explained/${g.slug}`}
                          className="flex min-h-[52px] items-center gap-3 px-4 py-2.5 transition hover:bg-tape"
                        >
                          <span className="w-6 shrink-0 font-display text-lg font-extrabold text-beam">{i + 1}</span>
                          <span className="min-w-0 flex-1 font-semibold leading-snug">
                            {g.title} ending explained
                            {g.year ? <span className="font-normal text-muted"> ({g.year})</span> : null}
                          </span>
                          {g.score ? <span className="shrink-0 text-sm font-bold">★ {g.score.toFixed(1)}</span> : null}
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null
            )}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16" aria-labelledby="promise-heading">
        <p className="text-sm font-bold uppercase text-beam">Why readers trust Marquee</p>
        <h2 id="promise-heading" className="mt-2 max-w-3xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Clear answers, without ruining the surprise
        </h2>
        <ul className="mt-8 grid gap-5 md:grid-cols-3">
          {promises.map((p) => (
            <li key={p.title} className="rounded-2xl border-2 border-ink bg-surface p-6">
              <h3 className="font-display text-xl font-bold">{p.title}</h3>
              <p className="mt-2 font-body text-base leading-relaxed text-muted">{p.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {franchises.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-16" aria-labelledby="featured-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase text-beam">Start a series</p>
              <h2 id="featured-heading" className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Featured watch orders
              </h2>
            </div>
            <Link
              href="/watch-order"
              className="inline-flex min-h-[44px] items-center rounded-full border-2 border-ink px-5 py-2 font-bold hover:bg-tape"
            >
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

      {moreFranchises.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-16" aria-labelledby="more-orders-heading">
          <h2 id="more-orders-heading" className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            More franchise watch orders
          </h2>
          <ul className="mt-6 flex flex-wrap gap-3">
            {moreFranchises.map((f) => (
              <li key={f.slug}>
                <Link
                  href={`/watch-order/${f.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full border-2 border-ink bg-surface px-4 py-2 text-sm font-bold transition hover:bg-tape"
                >
                  {f.title} watch order
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {latestGuides.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-20" aria-labelledby="latest-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="latest-heading" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Latest endings explained
            </h2>
            <Link
              href="/ending-explained"
              className="inline-flex min-h-[44px] items-center rounded-full border-2 border-ink px-5 py-2 font-bold hover:bg-tape"
            >
              See all guides
            </Link>
          </div>
          <div className="mt-8">
            <MediaGrid items={latestGuides} basePath="/ending-explained" />
          </div>
        </section>
      )}

      <section className="border-y-2 border-ink bg-surface" aria-labelledby="how-heading">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 id="how-heading" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            How Marquee works
          </h2>
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

      <section className="bg-ink text-white" aria-label="Story quotes">
        <ul className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-3">
          {quotes.map((q) => (
            <li key={q}>
              <blockquote className="border-l-4 border-tape pl-4 font-body text-lg italic leading-relaxed text-white/90">
                <p>&ldquo;{q}&rdquo;</p>
              </blockquote>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="questions-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 id="questions-heading" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Questions, answered
            </h2>
            <p className="mt-4 max-w-sm font-body text-lg text-muted">
              What the guides are, how they are made, and what to expect.
            </p>
          </div>
          <div>
            <Faq items={HOME_FAQ} title="About the guides" id="faq" headingLevel={3} />
            <div className="mt-8 border-t-2 border-ink pt-6">
              <h3 className="font-display text-2xl font-bold text-ink">Request an Ending</h3>
              <p className="mt-2 font-body text-base leading-relaxed text-muted">
                Have a movie or anime in mind? Send the title for consideration in a future guide.
              </p>
              <TitleRequestForm />
            </div>
          </div>
        </div>
      </section>

      <CtaBand
        title="Never be confused by a finale again."
        text="Find a clear explanation for the story you finished, or follow a franchise in the order it unfolds."
        primary={{ href: "/ending-explained", label: "Explore ending guides" }}
        secondary={{ href: "/watch-order", label: "Browse watch orders" }}
      />
    </>
  );
}
