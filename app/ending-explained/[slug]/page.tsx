import Link from "next/link";
import { getBaseUrl } from "@/lib/site";
import { notFound, permanentRedirect } from "next/navigation";
import { getPublishedMovieBySlugOrId, getSimilarMovies } from "@/lib/api/movies";
import { getPublishedAnimeBySlugOrId, getSimilarAnime } from "@/lib/api/anime";
import { buildOgImageUrl } from "@/lib/og";
import { SimilarTitles } from "@/components/media/SimilarTitles";
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

          {item.endingExplained ? (
            <div className="mt-8 space-y-8">
              {item.endingExplained.recap && (
                <section>
                  <h2 className="font-display text-2xl text-marquee-text">Recap</h2>
                  <p className="mt-2 text-marquee-textDim whitespace-pre-line">{item.endingExplained.recap}</p>
                </section>
              )}
              {item.endingExplained.ending && (
                <section>
                  <h2 className="font-display text-2xl text-marquee-text">How It Ends</h2>
                  <p className="mt-2 text-marquee-textDim whitespace-pre-line">{item.endingExplained.ending}</p>
                </section>
              )}
              {item.endingExplained.themes && (
                <section>
                  <h2 className="font-display text-2xl text-marquee-text">Themes &amp; Meaning</h2>
                  <p className="mt-2 text-marquee-textDim whitespace-pre-line">{item.endingExplained.themes}</p>
                </section>
              )}
              {faq.length > 0 && (
                <section>
                  <h2 className="font-display text-2xl text-marquee-text">FAQ</h2>
                  <div className="mt-3 space-y-4">
                    {faq.map((f, i) => (
                      <div key={i}>
                        <p className="font-semibold text-marquee-text">{f.q}</p>
                        <p className="mt-1 text-marquee-textDim">{f.a}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <p className="mt-6 text-marquee-textDim">{item.description}</p>
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
        <div className="mt-14">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-marquee-gold mb-4">Cast</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {item.castList.map((member) => (
              <div key={`${member.name}-${member.role}`} className="flex items-center gap-3 rounded border border-marquee-line bg-marquee-panel p-3">
                {member.photoUrl ? (
                  <img src={member.photoUrl} alt={member.name} className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded-full bg-marquee-line" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm text-marquee-text">{member.name}</p>
                  <p className="truncate text-xs text-marquee-textDim">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <SimilarTitles items={similar} basePath="/ending-explained" />

      <CommentSection type="ending-explained" slug={item.slug} />
    </div>
  );
}
