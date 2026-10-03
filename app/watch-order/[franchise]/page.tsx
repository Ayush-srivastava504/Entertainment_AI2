import Link from "next/link";
import { getBaseUrl } from "@/lib/site";
import { notFound } from "next/navigation";
import { getPublishedFranchiseBySlug, getFranchiseEntries, getAllPublishedFranchises } from "@/lib/api/franchises";
import { buildOgImageUrl } from "@/lib/og";
import { posterSrc, posterSrcSet } from "@/lib/image";
import { BarChart } from "@/components/media/BarChart";
import { Faq } from "@/components/ui/Faq";
import { Slate } from "@/components/ui/Slate";
import { CtaBand } from "@/components/ui/CtaBand";
import LikeButton from "@/components/LikeButton";
import CommentSection from "@/components/CommentSection";
import { articleNode, breadcrumbNode, graph, jsonLdString } from "@/lib/jsonld";
import { WATCH_ORDER_TOPICS, matchesFranchiseTopic } from "@/lib/topics";
import { formatDate, snippet } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

const BASE_URL = getBaseUrl();

export async function generateMetadata({ params }: { params: Promise<{ franchise: string }> }) {
  const { franchise: slug } = await params;
  const franchise = await getPublishedFranchiseBySlug(slug);
  if (!franchise) return {};

  const url = `${BASE_URL}/watch-order/${franchise.slug}`;
  const title = `${franchise.title} Watch Order: The Complete Guide`;
  const description = snippet(
    franchise.metaDescription || franchise.intro || `The best order to watch ${franchise.title}: release order, chronological order and which entries you can skip.`
  );

  const ogImage = buildOgImageUrl({
    title: franchise.title,
    subtitle: "Watch Order",
    badge: "WATCH ORDER",
  });

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: franchise.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: franchise.publishedAt ? new Date(franchise.publishedAt).toISOString() : undefined,
      modifiedTime: franchise.updatedAt ? new Date(franchise.updatedAt).toISOString() : undefined,
      authors: [SITE_NAME],
      section: "Watch Order",
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${franchise.title} watch order` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function WatchOrderPage({ params }: { params: Promise<{ franchise: string }> }) {
  const { franchise: slug } = await params;
  const franchise = await getPublishedFranchiseBySlug(slug);
  if (!franchise) notFound();

  const entries = await getFranchiseEntries(franchise.id, "recommended");
  const releaseEntries = entries.length > 0 ? entries : await getFranchiseEntries(franchise.id, "release");

  const resolvedEntries = releaseEntries.filter((e) => e.title);
  const ratingItems = resolvedEntries
    .filter((e) => typeof e.title!.score === "number" && e.title!.score! > 0)
    .map((e) => ({
      label: e.title!.title,
      value: e.title!.score as number,
      href: e.title!.endingExplained ? `/ending-explained/${e.title!.slug}` : undefined,
    }));

  const allFranchises = await getAllPublishedFranchises(60);
  const related = allFranchises.filter((f) => f.slug !== franchise.slug).slice(0, 8);
  const relatedTopics = WATCH_ORDER_TOPICS.filter((t) => matchesFranchiseTopic(franchise, t)).slice(0, 3);

  const url = `${BASE_URL}/watch-order/${franchise.slug}`;

  // FAQ answers are built only from the entries and scores in the database.
  const orderedTitles = resolvedEntries.map((e) => e.title!.title);
  const withGuides = resolvedEntries.filter((e) => e.title!.endingExplained);
  const topRated = [...resolvedEntries]
    .filter((e) => typeof e.title!.score === "number" && e.title!.score! > 0)
    .sort((a, b) => (b.title!.score as number) - (a.title!.score as number))[0];
  const years = resolvedEntries.map((e) => e.title!.year).filter((y): y is number => typeof y === "number");

  const faq = [
    ...franchise.faq,
    ...(orderedTitles.length > 0
      ? [
          {
            q: `What order should I watch ${franchise.title} in?`,
            a: `Watch in this order: ${orderedTitles.map((t, i) => `${i + 1}. ${t}`).join(", ")}.`,
          },
          {
            q: `How many entries are in ${franchise.title}?`,
            a: `This guide lists ${orderedTitles.length} ${orderedTitles.length === 1 ? "entry" : "entries"}${
              years.length ? `, released between ${Math.min(...years)} and ${Math.max(...years)}` : ""
            }.`,
          },
        ]
      : []),
    ...(topRated
      ? [
          {
            q: `Which ${franchise.title} entry is rated highest?`,
            a: `${topRated.title!.title} has the highest average rating in this guide, at ${(topRated.title!.score as number).toFixed(1)} out of 10.`,
          },
        ]
      : []),
    ...(withGuides.length > 0
      ? [
          {
            q: `Which ${franchise.title} entries have ending explained guides?`,
            a: `${withGuides.map((e) => e.title!.title).join(", ")}. Each links to a full guide with a recap, the ending, and an FAQ.`,
          },
        ]
      : []),
  ];

  const slateRows: [string, string][] = [
    ["Entries", String(resolvedEntries.length)],
    ...(years.length ? ([["Released", `${Math.min(...years)} to ${Math.max(...years)}`]] as [string, string][]) : []),
    ["Format", franchise.mediaType === "anime" ? "Anime" : franchise.mediaType === "mixed" ? "Movies and anime" : "Movies"],
    ...(withGuides.length ? ([["Ending guides", String(withGuides.length)]] as [string, string][]) : []),
  ];

  const iso = (v?: string) => {
    if (!v) return undefined;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  };
  const published = iso(franchise.publishedAt);
  const modified = iso(franchise.updatedAt);

  const watchLd = graph(
    articleNode({
      url,
      headline: `${franchise.title} Watch Order: The Complete Guide`,
      description: snippet(franchise.metaDescription || franchise.intro || `The best order to watch ${franchise.title}.`),
      datePublished: published,
      dateModified: modified,
      section: "Watch Order",
      keywords: [`${franchise.title} watch order`, `how to watch ${franchise.title}`],
      about: { "@type": "CreativeWork", name: franchise.title },
    }),
    {
      "@type": "ItemList",
      "@id": `${url}#list`,
      name: `${franchise.title} Watch Order`,
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      numberOfItems: resolvedEntries.length,
      itemListElement: resolvedEntries.map((e, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: e.title!.title,
        url: `${BASE_URL}/ending-explained/${e.title!.slug}`,
      })),
    },
    breadcrumbNode([
      { name: "Home", path: "/" },
      { name: "Watch Order", path: "/watch-order" },
      { name: franchise.title, path: `/watch-order/${franchise.slug}` },
    ])
  );
  const publishedLabel = formatDate(published);
  const updatedLabel = formatDate(modified);

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdString(watchLd) }}
      />

      <section className="border-b-2 border-ink bg-beam text-white">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="text-sm text-white/80">
            <Link href="/" className="hover:underline">Home</Link>
            <span aria-hidden="true"> / </span>
            <Link href="/watch-order" className="hover:underline">Watch order</Link>
          </nav>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            {franchise.title} watch order
          </h1>
          <p className="mt-4 text-sm font-semibold text-white/85">
            By <Link href="/about" className="underline underline-offset-2">{SITE_NAME} Editorial</Link>
            {publishedLabel && published ? (
              <>
                <span aria-hidden="true"> · </span>
                <time dateTime={published}>Published {publishedLabel}</time>
              </>
            ) : null}
            {updatedLabel && modified && updatedLabel !== publishedLabel ? (
              <>
                <span aria-hidden="true"> · </span>
                <time dateTime={modified}>Updated {updatedLabel}</time>
              </>
            ) : null}
            <span aria-hidden="true"> · </span>
            {resolvedEntries.length} {resolvedEntries.length === 1 ? "entry" : "entries"}
          </p>
          {franchise.intro && (
            <p className="mt-5 max-w-2xl font-body text-xl leading-relaxed text-white/90">{franchise.intro}</p>
          )}
          <div className="mt-6">
            <LikeButton type="watch-order" slug={franchise.slug} initialLikes={franchise.likes} tone="onDark" />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-14 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-14">
          <section id="order" className="scroll-mt-24">
            <h2 className="font-display text-3xl font-bold tracking-tight">How to watch {franchise.title} in order</h2>
            <ol className="mt-6 space-y-4">
              {releaseEntries.map((entry, i) => (
                <li key={i} className="flex gap-4 rounded-2xl border-2 border-ink bg-surface p-4 sm:p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-tape font-display text-xl font-extrabold">
                    {i + 1}
                  </span>
                  {entry.title ? (
                    <div className="flex min-w-0 flex-1 gap-4">
                      {entry.title.posterUrl && (
                        <img
                          src={posterSrc(entry.title.posterUrl, 185)}
                          srcSet={posterSrcSet(entry.title.posterUrl)}
                          sizes="64px"
                          width={64}
                          height={96}
                          decoding="async"
                          alt={`${entry.title.title} poster`}
                          loading="lazy"
                          className="h-24 w-16 shrink-0 rounded-lg border-2 border-ink object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        {entry.title.endingExplained ? (
                          <Link
                            href={`/ending-explained/${entry.title.slug}`}
                            className="font-display text-2xl font-bold leading-tight text-ink hover:text-beam"
                          >
                            {entry.title.title}
                          </Link>
                        ) : (
                          <p className="font-display text-2xl font-bold leading-tight">{entry.title.title}</p>
                        )}
                        <p className="mt-1 text-sm font-semibold text-muted">
                          {[entry.mediaType === "anime" ? "Anime" : "Movie", entry.title.year].filter(Boolean).join(", ")}
                        </p>
                        {entry.note && <p className="mt-2 font-body text-base leading-relaxed text-muted">{entry.note}</p>}
                        {entry.title.endingExplained && (
                          <Link
                            href={`/ending-explained/${entry.title.slug}`}
                            className="mt-3 inline-block rounded-full border-2 border-ink px-3 py-1 text-sm font-bold hover:bg-tape"
                          >
                            Read the ending explained
                          </Link>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="font-body text-muted">{entry.note ?? "Entry unavailable"}</p>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {resolvedEntries.length > 1 && (
            <section id="glance" className="scroll-mt-24">
              <h2 className="font-display text-3xl font-bold tracking-tight">{franchise.title} at a glance</h2>
              <div className="mt-5 overflow-x-auto rounded-2xl border-2 border-ink bg-surface">
                <table className="w-full min-w-[34rem] text-left">
                  <thead className="border-b-2 border-ink bg-tape">
                    <tr>
                      <th className="px-4 py-3 font-bold">#</th>
                      <th className="px-4 py-3 font-bold">Title</th>
                      <th className="px-4 py-3 font-bold">Type</th>
                      <th className="px-4 py-3 font-bold">Year</th>
                      <th className="px-4 py-3 font-bold">Rating</th>
                      <th className="px-4 py-3 font-bold">Guide</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolvedEntries.map((e, i) => (
                      <tr key={e.title!.slug} className="border-b border-fog last:border-0">
                        <td className="px-4 py-3 font-bold text-beam">{i + 1}</td>
                        <td className="px-4 py-3 font-semibold">{e.title!.title}</td>
                        <td className="px-4 py-3 text-muted">{e.mediaType === "anime" ? "Anime" : "Movie"}</td>
                        <td className="px-4 py-3 text-muted">{e.title!.year ?? "n/a"}</td>
                        <td className="px-4 py-3 text-muted">{e.title!.score ? `★ ${e.title!.score.toFixed(1)}` : "n/a"}</td>
                        <td className="px-4 py-3">
                          {e.title!.endingExplained ? (
                            <Link href={`/ending-explained/${e.title!.slug}`} className="font-semibold text-beam underline">
                              Ending explained
                            </Link>
                          ) : (
                            <span className="text-muted">Not yet</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {ratingItems.length > 1 && (
            <section id="ratings" className="scroll-mt-24">
              <BarChart
                title={`${franchise.title} entries by rating`}
                items={ratingItems}
                max={10}
                unit=" / 10"
                caption="Average audience ratings, in watch order."
              />
            </section>
          )}

          <Faq items={faq} title={`${franchise.title} watch order FAQ`} />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Slate title={`${franchise.title}, at a glance`} rows={slateRows} />
          <nav aria-label="On this page" className="rounded-2xl border-2 border-ink bg-surface p-5">
            <p className="font-display text-lg font-bold">On this page</p>
            <ul className="mt-3 space-y-1.5">
              <li><a href="#order" className="font-semibold text-beam hover:underline">The order</a></li>
              {resolvedEntries.length > 1 && <li><a href="#glance" className="font-semibold text-beam hover:underline">At a glance</a></li>}
              {ratingItems.length > 1 && <li><a href="#ratings" className="font-semibold text-beam hover:underline">Ratings</a></li>}
              {faq.length > 0 && <li><a href="#faq" className="font-semibold text-beam hover:underline">FAQ</a></li>}
            </ul>
          </nav>
          {related.length > 0 && (
            <div className="rounded-2xl border-2 border-ink bg-tape p-5">
              <p className="font-display text-lg font-bold">More watch orders</p>
              <ul className="mt-3 space-y-1.5">
                {related.map((f) => (
                  <li key={f.id}>
                    <Link href={`/watch-order/${f.slug}`} className="font-semibold underline underline-offset-2">
                      {f.title} watch order
                    </Link>
                  </li>
                ))}
              </ul>
              <ul className="mt-4 space-y-1.5 border-t-2 border-ink/20 pt-3">
                {relatedTopics.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/watch-order/topic/${t.slug}`} className="font-semibold underline underline-offset-2">
                      More {t.title.toLowerCase()}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/watch-order" className="font-semibold underline underline-offset-2">
                    All watch order guides
                  </Link>
                </li>
                <li>
                  <Link href="/ending-explained" className="font-semibold underline underline-offset-2">
                    Ending explained guides
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </aside>
      </div>

      <CtaBand
        title="Finished an entry?"
        text="Read what its ending meant, or search for another franchise."
        primary={{ href: "/ending-explained", label: "Ending explained guides" }}
        secondary={{ href: "/search", label: "Search" }}
      />

      <div className="mx-auto max-w-6xl px-6 pb-16">
        <CommentSection type="watch-order" slug={franchise.slug} />
      </div>
    </>
  );
}
