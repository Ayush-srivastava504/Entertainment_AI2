import Link from "next/link";
import { getBaseUrl } from "@/lib/site";
import { notFound } from "next/navigation";
import { getPublishedFranchiseBySlug, getFranchiseEntries, getAllPublishedFranchises } from "@/lib/api/franchises";
import { buildOgImageUrl } from "@/lib/og";
import LikeButton from "@/components/LikeButton";
import CommentSection from "@/components/CommentSection";

const BASE_URL = getBaseUrl();

export async function generateMetadata({ params }: { params: Promise<{ franchise: string }> }) {
  const { franchise: slug } = await params;
  const franchise = await getPublishedFranchiseBySlug(slug);
  if (!franchise) return {};

  const url = `${BASE_URL}/watch-order/${franchise.slug}`;
  const title = `${franchise.title} Watch Order: The Complete Guide | Marquees`;
  const description =
    franchise.metaDescription || franchise.intro?.slice(0, 155) || `The best order to watch ${franchise.title}.`;

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
      images: [{ url: ogImage, width: 1200, height: 630, alt: franchise.title }],
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

  const related = (await getAllPublishedFranchises(12)).filter((f) => f.slug !== franchise.slug).slice(0, 4);

  const url = `${BASE_URL}/watch-order/${franchise.slug}`;

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${franchise.title} Watch Order`,
    itemListElement: releaseEntries
      .filter((e) => e.title)
      .map((e, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: e.title!.title,
        url: `${BASE_URL}/ending-explained/${e.title!.slug}`,
      })),
  };

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${franchise.title} Watch Order`,
    about: franchise.title,
    datePublished: franchise.publishedAt,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Watch Order", item: `${BASE_URL}/watch-order` },
      { "@type": "ListItem", position: 2, name: franchise.title, item: url },
    ],
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }}
      />

      <nav className="mb-6 font-mono text-xs text-marquee-textDim">
        <Link href="/watch-order" className="hover:text-marquee-gold">Watch Order</Link> / {franchise.title}
      </nav>

      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">🎞 WATCH ORDER</p>
      <h1 className="mt-3 font-display text-3xl sm:text-5xl text-marquee-text">
        {franchise.title} Watch Order
      </h1>
      {franchise.intro && <p className="mt-4 text-marquee-textDim">{franchise.intro}</p>}

      <div className="mt-4">
        <LikeButton type="watch-order" slug={franchise.slug} initialLikes={franchise.likes} />
      </div>

      <ol className="mt-10 space-y-4">
        {releaseEntries.map((entry, i) => (
          <li key={i} className="ticket flex gap-4 p-4">
            <span className="font-display text-3xl text-marquee-gold w-10 shrink-0 text-center">{i + 1}</span>
            {entry.title ? (
              <div className="flex flex-1 gap-4">
                {entry.title.posterUrl && (
                  <img
                    src={entry.title.posterUrl}
                    alt={entry.title.title}
                    className="h-20 w-14 shrink-0 rounded object-cover"
                  />
                )}
                <div className="min-w-0">
                  {entry.title.endingExplained ? (
                    <Link
                      href={`/ending-explained/${entry.title.slug}`}
                      className="font-display text-xl text-marquee-text hover:text-marquee-gold"
                    >
                      {entry.title.title}
                    </Link>
                  ) : (
                    <p className="font-display text-xl text-marquee-text">{entry.title.title}</p>
                  )}
                  {entry.title.year && <p className="text-xs text-marquee-textDim">{entry.title.year}</p>}
                  {entry.note && <p className="mt-1 text-sm text-marquee-textDim">{entry.note}</p>}
                </div>
              </div>
            ) : (
              <p className="text-marquee-textDim">{entry.note ?? "Entry unavailable"}</p>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-8">
        <Link href="/watch-order" className="rounded border border-marquee-line px-4 py-2 text-marquee-text">
          Back to all watch orders
        </Link>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl text-marquee-text">More watch order guides</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {related.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/watch-order/${f.slug}`}
                  className="ticket block p-4 pl-8 text-marquee-text transition hover:border-marquee-gold"
                >
                  {f.title} watch order
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-sm text-marquee-textDim">
        Finished an entry? Read its{" "}
        <Link href="/ending-explained" className="text-marquee-gold hover:underline">ending explained</Link>{" "}
        guide, or <Link href="/search" className="text-marquee-gold hover:underline">search for another franchise</Link>.
      </p>

      <CommentSection type="watch-order" slug={franchise.slug} />
    </div>
  );
}
