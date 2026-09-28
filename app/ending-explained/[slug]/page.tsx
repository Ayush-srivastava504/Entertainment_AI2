import Link from "next/link";
import { getBaseUrl } from "@/lib/site";
import { notFound, permanentRedirect } from "next/navigation";
import { getPublishedMovieBySlugOrId, getSimilarMovies } from "@/lib/api/movies";
import { getPublishedAnimeBySlugOrId, getSimilarAnime } from "@/lib/api/anime";
import { buildOgImageUrl } from "@/lib/og";
import { SimilarTitles } from "@/components/media/SimilarTitles";
import { BarChart } from "@/components/media/BarChart";
import LikeButton from "@/components/LikeButton";
import FavoriteButton from "@/components/FavoriteButton";
import CommentSection from "@/components/CommentSection";
import { getFranchiseForTitle, getFranchiseEntries } from "@/lib/api/franchises";
import type { MediaItem } from "@/lib/api/normalize";

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
  const title = `${item.title}${item.year ? ` (${item.year})` : ""} Ending Explained: What Really Happens | Marquees`;
  const description =
    item.endingExplained?.ending?.slice(0, 155) ||
    item.description ||
    `A full breakdown of how ${item.title} ends.`;

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
      images: [{ url: ogImage, width: 1200, height: 630, alt: item.title }],
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
      ? await getSimilarMovies(item.id, item.genres)
      : await getSimilarAnime(item.id, item.genres);

  const franchise = await getFranchiseForTitle(item.kind, item.id);
  // Other guides in the same franchise, so each guide links to its siblings.
  const siblingGuides = franchise
    ? (await getFranchiseEntries(franchise.id, "release"))
        .map((e) => e.title)
        .filter((t): t is MediaItem => Boolean(t && t.endingExplained && t.slug !== item.slug))
        .slice(0, 6)
    : [];
  const faq = item.endingExplained?.faq ?? [];

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

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${item.title} Ending Explained`,
    image: item.posterUrl || undefined,
    datePublished: item.endingExplainedPublishedAt || undefined,
    about: item.title,
    genre: item.genres,
    ...(item.castList && item.castList.length > 0
      ? { mentions: item.castList.map((m) => ({ "@type": "Person", name: m.name })) }
      : {}),
  };

  const faqLd =
    faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ending Explained", item: `${BASE_URL}/ending-explained` },
      { "@type": "ListItem", position: 2, name: item.title, item: url },
    ],
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd).replace(/</g, "\\u003c") }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }}
        />
      )}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }}
      />

      <nav className="mb-6 font-mono text-xs text-marquee-textDim">
        <Link href="/ending-explained" className="hover:text-marquee-gold">
          Ending Explained
        </Link>{" "}
        / {item.title}
      </nav>

      <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded border border-marquee-line bg-marquee-panel">
          {item.posterUrl ? (
            <img src={item.posterUrl} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="p-8 text-sm text-marquee-textDim">No poster</div>
          )}
        </div>

        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">
            {item.kind === "anime" ? "🍥 anime" : "🎬 movie"} · ending explained
          </p>
          <h1 className="mt-3 font-display text-3xl sm:text-5xl text-marquee-text">
            {item.title} Ending Explained
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-marquee-textDim">
            {item.year ? <span className="rounded border border-marquee-line px-3 py-1">{item.year}</span> : null}
            {item.score ? <span className="rounded border border-marquee-line px-3 py-1">★ {item.score.toFixed(1)}</span> : null}
            {item.genres.map((genre) => (
              <span key={genre} className="rounded border border-marquee-line px-3 py-1">{genre}</span>
            ))}
            <LikeButton type={item.kind} slug={item.slug} initialLikes={item.likes} />
            <FavoriteButton id={`${item.kind}:${item.id}`} type={item.kind} title={item.title} />
          </div>

          <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2 text-xs">
            {toc.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-full border border-marquee-line px-3 py-1 text-marquee-textDim hover:border-marquee-gold hover:text-marquee-gold">
                {label}
              </a>
            ))}
          </nav>

          {item.endingExplained ? (
            <div className="mt-8 space-y-8">
              {item.endingExplained.recap && (
                <section id="recap" className="scroll-mt-24">
                  <h2 className="font-display text-2xl text-marquee-text">Recap</h2>
                  <p className="mt-2 text-marquee-textDim whitespace-pre-line">{item.endingExplained.recap}</p>
                </section>
              )}
              {item.endingExplained.ending && (
                <section id="ending" className="scroll-mt-24">
                  <h2 className="font-display text-2xl text-marquee-text">How It Ends</h2>
                  <p className="mt-2 text-marquee-textDim whitespace-pre-line">{item.endingExplained.ending}</p>
                </section>
              )}
              {item.endingExplained.themes && (
                <section id="themes" className="scroll-mt-24">
                  <h2 className="font-display text-2xl text-marquee-text">Themes &amp; Meaning</h2>
                  <p className="mt-2 text-marquee-textDim whitespace-pre-line">{item.endingExplained.themes}</p>
                </section>
              )}
              {faq.length > 0 && (
                <section id="faq" className="scroll-mt-24">
                  <h2 className="font-display text-2xl text-marquee-text">{item.title} Ending FAQ</h2>
                  <div className="mt-3 divide-y divide-marquee-line rounded border border-marquee-line">
                    {faq.map((f, i) => (
                      <details key={i} className="group p-4" open={i === 0}>
                        <summary className="cursor-pointer list-none font-semibold text-marquee-text marker:hidden">
                          {f.q}
                        </summary>
                        <p className="mt-2 text-marquee-textDim">{f.a}</p>
                      </details>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <p className="mt-6 text-marquee-textDim">{item.description}</p>
          )}

          <section id="facts" className="mt-10 scroll-mt-24">
            <h2 className="font-display text-2xl text-marquee-text">{item.title} quick facts</h2>
            <table className="mt-3 w-full border-collapse overflow-hidden rounded border border-marquee-line text-sm">
              <tbody>
                {factRows.map(([label, value]) => (
                  <tr key={label} className="border-b border-marquee-line last:border-0">
                    <th scope="row" className="w-40 bg-marquee-panel px-4 py-2 text-left font-mono text-xs uppercase tracking-wider text-marquee-textDim">
                      {label}
                    </th>
                    <td className="px-4 py-2 text-marquee-text">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {ratingChartItems.length > 1 && (
            <section id="ratings" className="mt-10 scroll-mt-24">
              <BarChart
                title={`How ${item.title} rates against similar titles`}
                items={ratingChartItems}
                max={10}
                unit=" / 10"
                caption="Average audience ratings from the source database; click a title to read its ending explained."
              />
            </section>
          )}

          {providerRows.length > 0 && (
            <section id="watch" className="mt-10 scroll-mt-24">
              <h2 className="font-display text-2xl text-marquee-text">Where to watch {item.title}</h2>
              <table className="mt-3 w-full border-collapse overflow-hidden rounded border border-marquee-line text-sm">
                <thead className="bg-marquee-panel text-left font-mono text-xs uppercase tracking-wider text-marquee-textDim">
                  <tr>
                    <th className="px-4 py-2">How</th>
                    <th className="px-4 py-2">Available on</th>
                  </tr>
                </thead>
                <tbody>
                  {providerRows.map(([how, list]) => (
                    <tr key={how} className="border-t border-marquee-line">
                      <th scope="row" className="px-4 py-2 text-left text-marquee-text">{how}</th>
                      <td className="px-4 py-2 text-marquee-textDim">{list.map((p) => p.name).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {providers?.region && (
                <p className="mt-2 text-xs text-marquee-textDim">Availability for region {providers.region}; it varies by country.</p>
              )}
            </section>
          )}

          {franchise && (
            <div className="mt-10 rounded border border-marquee-line bg-marquee-panel p-5">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-marquee-gold">Part of a franchise</p>
              <p className="mt-2 text-marquee-textDim">
                Not sure where {item.title} fits? See the{" "}
                <Link href={`/watch-order/${franchise.slug}`} className="text-marquee-gold hover:underline">
                  {franchise.title} watch order
                </Link>
                .
              </p>
              {siblingGuides.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {siblingGuides.map((t) => (
                    <li key={t.slug}>
                      <Link
                        href={`/ending-explained/${t.slug}`}
                        className="rounded-full border border-marquee-line px-3 py-1 text-xs text-marquee-text hover:border-marquee-gold hover:text-marquee-gold"
                      >
                        {t.title} ending explained
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {item.tags && item.tags.length > 0 && (
            <div className="mt-10">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-marquee-gold mb-3">Tags</p>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-marquee-line px-3 py-1 text-xs text-marquee-textDim">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            <Link href="/ending-explained" className="rounded border border-marquee-line px-4 py-2 text-marquee-text">
              Back to all guides
            </Link>
          </div>
        </div>
      </div>

      {item.castList && item.castList.length > 0 && (
        <section id="cast" className="mt-14 scroll-mt-24">
          <h2 className="font-display text-2xl text-marquee-text">{item.title} cast</h2>
          <table className="mt-4 w-full border-collapse overflow-hidden rounded border border-marquee-line text-sm">
            <thead className="bg-marquee-panel text-left font-mono text-xs uppercase tracking-wider text-marquee-textDim">
              <tr>
                <th className="px-4 py-2">{item.kind === "anime" ? "Character" : "Actor"}</th>
                <th className="px-4 py-2">{item.kind === "anime" ? "Role" : "Character"}</th>
              </tr>
            </thead>
            <tbody>
              {item.castList.map((member) => (
                <tr key={`${member.name}-${member.role}`} className="border-t border-marquee-line">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      {member.photoUrl ? (
                        <img src={member.photoUrl} alt={member.name} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 shrink-0 rounded-full bg-marquee-line" />
                      )}
                      <span className="text-marquee-text">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-marquee-textDim">{member.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <SimilarTitles items={similar} basePath="/ending-explained" />

      <CommentSection type="ending-explained" slug={item.slug} />
    </div>
  );
}
