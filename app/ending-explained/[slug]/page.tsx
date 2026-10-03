import Link from "next/link";
import { getBaseUrl } from "@/lib/site";
import { notFound, permanentRedirect } from "next/navigation";
import { getPublishedMovieBySlugOrId, getSimilarMovies } from "@/lib/api/movies";
import { getPublishedAnimeBySlugOrId, getSimilarAnime } from "@/lib/api/anime";
import { buildOgImageUrl } from "@/lib/og";
import { posterSrc, posterSrcSet } from "@/lib/image";
import { SimilarTitles } from "@/components/media/SimilarTitles";
import { BarChart } from "@/components/media/BarChart";
import { Faq } from "@/components/ui/Faq";
import { Slate } from "@/components/ui/Slate";
import { SpoilerGate } from "@/components/ui/SpoilerGate";
import LikeButton from "@/components/LikeButton";
import FavoriteButton from "@/components/FavoriteButton";
import CommentSection from "@/components/CommentSection";
import { getFranchiseForTitle, getFranchiseEntries } from "@/lib/api/franchises";
import type { MediaItem } from "@/lib/api/normalize";
import { getAdjacentGuides } from "@/lib/api/guides";
import { ENDING_TOPICS, matchesMediaTopic } from "@/lib/topics";
import { articleNode, breadcrumbNode, graph, jsonLdString } from "@/lib/jsonld";
import { formatDate, readingMinutes, snippet, toParagraphs } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

const BASE_URL = getBaseUrl();

/**
 * A slug can belong to either table — movies are tried first (the larger
 * catalog), then anime. Both tables' slugs embed their own numeric id, so
 * collisions across tables are effectively impossible.
 */
async function resolveTitle(
  slug: string
): Promise<{ item: MediaItem; isCanonical: boolean } | null> {
  const movieResult = await getPublishedMovieBySlugOrId(slug);
  if (movieResult) return { item: movieResult.movie, isCanonical: movieResult.isCanonical };

  const animeResult = await getPublishedAnimeBySlugOrId(slug);
  if (animeResult) return { item: animeResult.anime, isCanonical: animeResult.isCanonical };

  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveTitle(slug);
  if (!resolved) return {};
  const { item } = resolved;

  const url = `${BASE_URL}/ending-explained/${item.slug}`;
  // The root layout appends " | Marquee". "& Meaning" targets the second
  // half of the intent ("ending explained" + "what does the ending mean").
  const title = `${item.title}${item.year ? ` (${item.year})` : ""} Ending Explained & Meaning`;
  const description = snippet(
    item.endingExplained?.metaDescription ||
      item.endingExplained?.keyTakeaways?.[0] ||
      item.endingExplained?.ending ||
      item.description ||
      `A full breakdown of how ${item.title} ends.`
  );

  const ogImage = buildOgImageUrl({
    title: item.title,
    subtitle: "Ending Explained",
    badge: item.kind === "anime" ? "ANIME" : "MOVIE",
    poster: item.posterUrl,
    rating: item.score ? item.score.toFixed(1) : undefined,
  });

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: item.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: item.endingExplainedPublishedAt,
      modifiedTime: item.endingExplainedPublishedAt,
      authors: [SITE_NAME],
      section: "Ending Explained",
      tags: item.tags,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${item.title} ending explained` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function EndingExplainedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveTitle(slug);
  if (!resolved) notFound();
  const { item, isCanonical } = resolved;

  // Legacy or out-of-date URL — send to the canonical slug with a
  // permanent redirect so links/search rankings consolidate onto one URL.
  if (!isCanonical) {
    permanentRedirect(`/ending-explained/${item.slug}`);
  }

  const url = `${BASE_URL}/ending-explained/${item.slug}`;
  const similar =
    item.kind === "movie"
      ? await getSimilarMovies(item.id, item.genres, 8)
      : await getSimilarAnime(item.id, item.genres, 8);
  const { newer, older } = await getAdjacentGuides(item.kind, item.id);
  const relatedTopics = ENDING_TOPICS.filter((t) => matchesMediaTopic(item, t)).slice(0, 4);

  const franchise = await getFranchiseForTitle(item.kind, item.id);
  // Other guides in the same franchise, so each guide links to its siblings.
  const siblingGuides = franchise
    ? (await getFranchiseEntries(franchise.id, "release"))
        .map((e) => e.title)
        .filter((t): t is MediaItem => Boolean(t && t.endingExplained && t.slug !== item.slug))
        .slice(0, 6)
    : [];
  const aiFaq = item.endingExplained?.faq ?? [];

  // Rating chart: this title vs the similar titles shown below (real scores only).
  const ratingChartItems = [item, ...similar]
    .filter((t) => typeof t.score === "number" && t.score > 0)
    .slice(0, 6)
    .map((t) => ({
      label: t.title,
      value: t.score as number,
      highlight: t.slug === item.slug,
      href: t.slug === item.slug ? undefined : `/ending-explained/${t.slug}`,
    }));

  const providers = item.watchProviders;
  const providerRows = providers
    ? ([
        ["Stream", providers.flatrate],
        ["Rent", providers.rent],
        ["Buy", providers.buy],
      ] as const).filter(([, list]) => list.length > 0)
    : [];

  const factRows: [string, string][] = [
    ["Type", item.kind === "anime" ? "Anime" : "Movie"],
    ...(item.year ? ([["Year", String(item.year)]] as [string, string][]) : []),
    ...(item.genres.length ? ([["Genres", item.genres.join(", ")]] as [string, string][]) : []),
    ...(item.score ? ([["Rating", `${item.score.toFixed(1)} / 10`]] as [string, string][]) : []),
    ...(item.ratingCount ? ([["Ratings counted", item.ratingCount.toLocaleString("en-US")]] as [string, string][]) : []),
    ...(item.castList?.length ? ([["Cast listed", String(item.castList.length)]] as [string, string][]) : []),
    ...(item.endingExplainedWordCount ? ([["Guide length", `${item.endingExplainedWordCount.toLocaleString("en-US")} words`]] as [string, string][]) : []),
  ];

  // Guide FAQ (generated) plus answers we can state from real catalog data.
  const faq = [
    ...aiFaq,
    ...(providerRows.length > 0
      ? [
          {
            q: `Where can I watch ${item.title}?`,
            a: `${providerRows.map(([how, list]) => `${how}: ${list.map((p) => p.name).join(", ")}`).join(". ")}.${
              providers?.region ? ` Availability listed for region ${providers.region} and varies by country.` : ""
            }`,
          },
        ]
      : []),
    ...(franchise
      ? [
          {
            q: `Where does ${item.title} fit in the ${franchise.title} watch order?`,
            a: `See the ${franchise.title} watch order guide for the full order and notes on each entry.`,
          },
        ]
      : []),
  ];

  const toc = [
    item.endingExplained?.recap && ["recap", "Recap"],
    item.endingExplained?.ending && ["ending", "How it ends"],
    item.endingExplained?.themes && ["themes", "Themes"],
    ["facts", "Quick facts"],
    ratingChartItems.length > 1 && ["ratings", "Ratings compared"],
    providerRows.length > 0 && ["watch", "Where to watch"],
    faq.length > 0 && ["faq", "FAQ"],
    item.castList?.length && ["cast", "Cast"],
  ].filter(Boolean) as [string, string][];

  const ee0 = item.endingExplained;
  const published = item.endingExplainedPublishedAt;
  const guideLd = graph(
    articleNode({
      url,
      headline: `${item.title}${item.year ? ` (${item.year})` : ""} Ending Explained & Meaning`,
      description: snippet(ee0?.metaDescription || ee0?.keyTakeaways?.[0] || item.description),
      images: item.posterUrl ? [item.posterUrl] : undefined,
      datePublished: published,
      wordCount: item.endingExplainedWordCount,
      section: "Ending Explained",
      keywords: [`${item.title} ending explained`, `${item.title} ending meaning`, ...(item.tags ?? [])].slice(0, 8),
      about: {
        "@type": item.kind === "movie" ? "Movie" : "CreativeWork",
        name: item.title,
        ...(item.year ? { dateCreated: String(item.year) } : {}),
        genre: item.genres,
        ...(item.castList && item.castList.length > 0
          ? { actor: item.castList.slice(0, 10).map((m) => ({ "@type": "Person", name: m.name })) }
          : {}),
      },
    }),
    breadcrumbNode([
      { name: "Home", path: "/" },
      { name: "Ending Explained", path: "/ending-explained" },
      { name: item.title, path: `/ending-explained/${item.slug}` },
    ])
  );
  const publishedLabel = formatDate(published);
  const minutes = readingMinutes(item.endingExplainedWordCount);

  const ee = item.endingExplained;
  const kindLabel = item.kind === "anime" ? "Anime" : "Movie";

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdString(guideLd) }}
      />

      {/* Title card */}
      <section className="overflow-hidden border-b-2 border-ink bg-beam text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-12 sm:py-16 lg:grid-cols-[1fr_260px]">
          <div>
            <nav aria-label="Breadcrumb" className="text-sm text-white/80">
              <Link href="/" className="hover:underline">Home</Link>
              <span aria-hidden="true"> / </span>
              <Link href="/ending-explained" className="hover:underline">Ending explained</Link>
            </nav>
            <p className="mt-5 inline-block rounded-full border-2 border-ink bg-tape px-3 py-1 text-sm font-bold text-ink">
              {kindLabel} guide, contains spoilers
            </p>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              {item.title} ending explained
            </h1>
            <p className="mt-4 text-sm font-semibold text-white/85">
              By <Link href="/about" className="underline underline-offset-2">{SITE_NAME} Editorial</Link>
              {publishedLabel && published ? (
                <>
                  <span aria-hidden="true"> · </span>
                  <time dateTime={published}>Published {publishedLabel}</time>
                </>
              ) : null}
              <span aria-hidden="true"> · </span>
              {minutes} min read
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm font-semibold">
              {item.year ? <span className="rounded-full bg-white/15 px-3 py-1">{item.year}</span> : null}
              {item.score ? <span className="rounded-full bg-white/15 px-3 py-1">★ {item.score.toFixed(1)}</span> : null}
              {item.genres.map((genre) => (
                <span key={genre} className="rounded-full bg-white/15 px-3 py-1">{genre}</span>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <LikeButton type={item.kind} slug={item.slug} initialLikes={item.likes} tone="onDark" />
              <FavoriteButton id={`${item.kind}:${item.id}`} type={item.kind} title={item.title} tone="onDark" />
            </div>
          </div>
          <div className="mx-auto w-48 rotate-2 overflow-hidden rounded-xl border-4 border-white bg-fog shadow-block lg:w-full">
            {item.posterUrl ? (
              <img
                src={posterSrc(item.posterUrl, 342)}
                srcSet={posterSrcSet(item.posterUrl)}
                sizes="(min-width: 1024px) 360px, 192px"
                width={342}
                height={513}
                fetchPriority="high"
                decoding="async"
                alt={`${item.title}${item.year ? ` (${item.year})` : ""} poster`}
                className="aspect-[2/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[2/3] items-center justify-center p-6 text-center text-sm text-muted">No poster yet</div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-14 lg:grid-cols-[minmax(0,1fr)_330px]">
        <article className="min-w-0 space-y-14">
          <nav aria-label="On this page" className="flex flex-wrap gap-2 lg:hidden">
            {toc.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-full border-2 border-ink bg-surface px-3 py-1 text-sm font-semibold hover:bg-tape">
                {label}
              </a>
            ))}
          </nav>

          {ee ? (
            <>
              {ee.recap && (
                <section id="recap" className="scroll-mt-24">
                  <h2 className="font-display text-3xl font-bold tracking-tight">{item.title} plot recap, spoiler-light</h2>
                  {toParagraphs(ee.recap).map((para, i) => (
                    <p key={i} className="guide-prose mt-4">{para}</p>
                  ))}
                </section>
              )}
              {ee.ending && (
                <section id="ending" className="scroll-mt-24">
                  <h2 className="font-display text-3xl font-bold tracking-tight">What happens at the end of {item.title}?</h2>
                  <div className="mt-4">
                    <SpoilerGate>
                      {ee.keyTakeaways && ee.keyTakeaways.length > 0 && (
                        <div className="mb-6 rounded-2xl border-2 border-ink bg-tape p-5">
                          <p className="font-display text-lg font-bold">Key takeaways</p>
                          <ul className="mt-2 list-disc space-y-1.5 pl-5 font-body text-base text-ink">
                            {ee.keyTakeaways.map((t) => (
                              <li key={t}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {toParagraphs(ee.ending).map((para, i) => (
                        <p key={i} className={`guide-prose ${i > 0 ? "mt-4" : ""}`}>{para}</p>
                      ))}
                    </SpoilerGate>
                  </div>
                </section>
              )}
              {ee.themes && (
                <section id="themes" className="scroll-mt-24">
                  <h2 className="font-display text-3xl font-bold tracking-tight">What does the ending of {item.title} mean?</h2>
                  {toParagraphs(ee.themes).map((para, i) => (
                    <p key={i} className="guide-prose mt-4">{para}</p>
                  ))}
                </section>
              )}
            </>
          ) : (
            <p className="guide-prose">{item.description}</p>
          )}

          {ratingChartItems.length > 1 && (
            <section id="ratings" className="scroll-mt-24">
              <BarChart
                title={`How ${item.title} rates against similar titles`}
                items={ratingChartItems}
                max={10}
                unit=" / 10"
                caption="Average audience ratings from the source database. Click a title to read its ending explained."
              />
            </section>
          )}

          {providerRows.length > 0 && (
            <section id="watch" className="scroll-mt-24">
              <h2 className="font-display text-3xl font-bold tracking-tight">Where to watch {item.title}</h2>
              <div className="mt-5 overflow-x-auto rounded-2xl border-2 border-ink bg-surface">
                <table className="w-full min-w-[20rem] text-left">
                  <thead className="border-b-2 border-ink bg-tape">
                    <tr>
                      <th className="px-5 py-3 font-bold">How</th>
                      <th className="px-5 py-3 font-bold">Available on</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providerRows.map(([how, list]) => (
                      <tr key={how} className="border-b border-fog last:border-0">
                        <th scope="row" className="px-5 py-3 font-semibold">{how}</th>
                        <td className="px-5 py-3 font-body text-muted">{list.map((p) => p.name).join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {providers?.region && (
                <p className="mt-2 text-sm text-muted">Listed for region {providers.region}. Availability varies by country.</p>
              )}
            </section>
          )}

          <Faq items={faq} title={`${item.title} ending FAQ`} />

          {item.castList && item.castList.length > 0 && (
            <section id="cast" className="scroll-mt-24">
              <h2 className="font-display text-3xl font-bold tracking-tight">{item.title} cast</h2>
              <div className="mt-5 overflow-x-auto rounded-2xl border-2 border-ink bg-surface">
                <table className="w-full min-w-[20rem] text-left">
                  <thead className="border-b-2 border-ink bg-tape">
                    <tr>
                      <th className="px-5 py-3 font-bold">{item.kind === "anime" ? "Character" : "Actor"}</th>
                      <th className="px-5 py-3 font-bold">{item.kind === "anime" ? "Role" : "Character"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.castList.map((member) => (
                      <tr key={`${member.name}-${member.role}`} className="border-b border-fog last:border-0">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {member.photoUrl ? (
                              <img src={member.photoUrl} alt={member.name} loading="lazy" className="h-11 w-11 shrink-0 rounded-full border-2 border-ink object-cover" />
                            ) : (
                              <div className="h-11 w-11 shrink-0 rounded-full border-2 border-ink bg-fog" />
                            )}
                            <span className="font-semibold">{member.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-body text-muted">{member.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span key={tag} className="rounded-full border-2 border-ink bg-surface px-3 py-1 text-sm font-semibold">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </article>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div id="facts" className="scroll-mt-24">
            <Slate title={`${item.title}, at a glance`} rows={factRows} />
          </div>

          <nav aria-label="On this page" className="hidden rounded-2xl border-2 border-ink bg-surface p-5 lg:block">
            <p className="font-display text-lg font-bold">On this page</p>
            <ul className="mt-3 space-y-1.5">
              {toc.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className="font-semibold text-beam hover:underline">{label}</a>
                </li>
              ))}
            </ul>
          </nav>

          {franchise && (
            <div className="rounded-2xl border-2 border-ink bg-tape p-5">
              <p className="font-display text-lg font-bold">Part of {franchise.title}</p>
              <p className="mt-1 font-body text-base text-ink/80">Not sure where {item.title} fits?</p>
              <Link
                href={`/watch-order/${franchise.slug}`}
                className="mt-3 inline-block rounded-full border-2 border-ink bg-ink px-4 py-2 text-sm font-bold text-white"
              >
                {franchise.title} watch order
              </Link>
              {siblingGuides.length > 0 && (
                <ul className="mt-4 space-y-1.5 border-t-2 border-ink/20 pt-3">
                  {siblingGuides.map((t) => (
                    <li key={t.slug}>
                      <Link href={`/ending-explained/${t.slug}`} className="font-semibold underline underline-offset-2">
                        {t.title} ending explained
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-16">
        {(newer || older) && (
          <nav aria-label="More ending explained guides" className="mt-16 grid gap-4 sm:grid-cols-2">
            {older ? (
              <Link
                href={`/ending-explained/${older.slug}`}
                rel="prev"
                className="rounded-2xl border-2 border-ink bg-surface p-5 transition hover:-translate-y-1 hover:shadow-block"
              >
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Previous guide</span>
                <span className="mt-1 block font-display text-xl font-bold leading-tight">{older.title} ending explained</span>
              </Link>
            ) : <span />}
            {newer ? (
              <Link
                href={`/ending-explained/${newer.slug}`}
                rel="next"
                className="rounded-2xl border-2 border-ink bg-surface p-5 text-left transition hover:-translate-y-1 hover:shadow-block sm:text-right"
              >
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Next guide</span>
                <span className="mt-1 block font-display text-xl font-bold leading-tight">{newer.title} ending explained</span>
              </Link>
            ) : <span />}
          </nav>
        )}

        <SimilarTitles items={similar} basePath="/ending-explained" max={8} />

        <section className="mt-12" aria-label="Keep exploring">
          <p className="font-display text-xl font-bold">Keep exploring</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {relatedTopics.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/ending-explained/topic/${t.slug}`}
                  className="rounded-full border-2 border-ink bg-surface px-4 py-2 text-sm font-bold hover:bg-tape"
                >
                  More {t.title.toLowerCase()}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/ending-explained" className="rounded-full border-2 border-ink bg-tape px-4 py-2 text-sm font-bold">
                All ending explained guides
              </Link>
            </li>
            <li>
              <Link href="/watch-order" className="rounded-full border-2 border-ink bg-surface px-4 py-2 text-sm font-bold hover:bg-tape">
                Franchise watch orders
              </Link>
            </li>
          </ul>
        </section>
        <CommentSection type="ending-explained" slug={item.slug} />
      </div>
    </>
  );
}
