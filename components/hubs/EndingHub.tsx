/*
Body of the /ending-explained hub. Page 1 is app/ending-explained/page.tsx;
/ending-explained?page=N is rewritten by middleware.ts to
app/ending-explained/p/[n], so neither reads searchParams and both are cached
(ISR) instead of rendered on every request (2.9 s before). Old ?type= URLs
are redirected in middleware.ts.
*/
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBaseUrl } from "@/lib/site";
import { countGuides, getGuidesPage, GUIDES_PER_PAGE } from "@/lib/api/guides";
import { Pagination } from "@/components/ui/Pagination";
import { MediaGrid } from "@/components/media/MediaGrid";
import { SearchBar } from "@/components/media/SearchBar";
import { PageHero } from "@/components/ui/PageHero";
import { Faq } from "@/components/ui/Faq";
import { CtaBand } from "@/components/ui/CtaBand";
import { ENDING_INDEX_FAQ } from "@/lib/faq";
import { TitleRequestForm } from "@/components/TitleRequestForm";
import { TopicLinks } from "@/components/topics/TopicLinks";
import { getIndexableEndingTopics } from "@/lib/api/topic-hubs";
import { getTopRatedGuides } from "@/lib/api/hub";
import { getFeaturedFranchises } from "@/lib/api/franchises";
import { breadcrumbNode, graph, jsonLdString } from "@/lib/jsonld";

const BASE_URL = getBaseUrl();

/** One page of the /ending-explained hub (page 1 is the hub itself). */
export default async function EndingHub({ page }: { page: number }) {
  const active = "all" as const;
  const total = await countGuides(active);
  const items = await getGuidesPage(active, page);
  // These pages are cached (ISR). The guide queries return 0 / [] on a DB
  // error; throwing keeps the last good version instead of caching an empty
  // hub (or a 404 for page 2+) for an hour.
  if (total === 0 || items.length === 0) {
    if (total > 0 && page > Math.ceil(total / GUIDES_PER_PAGE)) notFound();
    throw new Error("guide list unavailable");
  }
  const totalPages = Math.max(1, Math.ceil(total / GUIDES_PER_PAGE));
  const [topAnime, franchises] = await Promise.all([
    getTopRatedGuides(6),
    getFeaturedFranchises(8),
  ]);

  // CollectionPage + ItemList + breadcrumb: tells search engines this is the
  // hub for every guide, and which guides sit on this page.
  const hubUrl = `${BASE_URL}/ending-explained`;
  const hubLd = graph(
    {
      "@type": "CollectionPage",
      "@id": `${hubUrl}#webpage`,
      url: hubUrl,
      name: "Anime Ending Explained Guides",
      inLanguage: "en",
      isPartOf: { "@id": `${BASE_URL}/#website` },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: total,
        itemListElement: items.map((g, i) => ({
          "@type": "ListItem",
          position: (page - 1) * GUIDES_PER_PAGE + i + 1,
          url: `${BASE_URL}/ending-explained/${g.slug}`,
          name: `${g.title} ending explained`,
        })),
      },
    },
    breadcrumbNode([
      { name: "Home", path: "/" },
      { name: "Ending Explained", path: "/ending-explained" },
    ])
  );
  const showIntro = page === 1 && active === "all";
  // Only topics with enough guides exist; on a DB error show no topic links
  // rather than links that might 404.
  const topics = await getIndexableEndingTopics().catch(() => []);

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdString(hubLd) }}
      />
      <PageHero
        kicker="Ending explained"
        title="Every ending, actually explained"
        subtitle="How anime end: a recap, the ending itself, what it means, and the questions people search for most."
      >
        <SearchBar path="/search" />
      </PageHero>

      <TopicLinks topics={topics} basePath="/ending-explained" />

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {showIntro && (
          <section className="mb-12 max-w-3xl" aria-labelledby="hub-intro">
            <h2 id="hub-intro" className="font-display text-3xl font-extrabold tracking-tight">
              How the ending explained guides work
            </h2>
            <p className="mt-4 font-body text-lg leading-relaxed text-muted">
              Every guide on Animegirl4u covers one anime in the same four parts: a spoiler-light recap, what
              actually happens at the end, what the ending means, and answers to the questions viewers ask most.
              Spoilers stay blurred until you tap reveal, and each guide separates what the story confirms from
              what fans read into it. Not sure where to begin? Pick a collection above, start with the{" "}
              <Link href="/ending-explained/topic/anime-finales" className="font-semibold text-beam underline underline-offset-4">anime finales</Link>{" "}
              or the{" "}
              <Link href="/ending-explained/topic/mind-bending-endings" className="font-semibold text-beam underline underline-offset-4">mind-bending endings</Link>,
              or read a franchise{" "}
              <Link href="/watch-order" className="font-semibold text-beam underline underline-offset-4">watch order</Link>{" "}
              first. You can also{" "}
              <Link href="/about" className="font-semibold text-beam underline underline-offset-4">see how every guide is researched and checked</Link>.
            </p>
          </section>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <p className="ml-auto text-sm font-semibold text-muted">{total.toLocaleString("en-US")} guides, page {page} of {totalPages}</p>
        </div>

        {items.length === 0 ? (
          <div className="mt-10 rounded-2xl border-2 border-ink bg-surface p-8">
            <p className="font-display text-2xl font-bold">No guides here yet</p>
            <p className="mt-2 font-body text-muted">
              Check back soon, or{" "}
              <Link href="/watch-order" className="font-semibold text-beam underline">
                browse watch order guides
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="mt-8">
            <MediaGrid items={items} basePath="/ending-explained" />
            <Pagination
              page={page}
              totalPages={totalPages}
              basePath="/ending-explained"
              params={active === "all" ? {} : { type: active }}
            />
          </div>
        )}

        {showIntro && (topAnime.length > 0 || franchises.length > 0) && (
          <section className="mt-20" aria-labelledby="hub-next">
            <h2 id="hub-next" className="font-display text-3xl font-extrabold tracking-tight">
              Popular places to start
            </h2>
            <div className="mt-6 grid gap-8 md:grid-cols-3">
              {[
                { label: "Top-rated anime finales", list: topAnime.map((g) => ({ href: `/ending-explained/${g.slug}`, text: `${g.title} ending explained` })) },
                { label: "Featured watch orders", list: franchises.map((f) => ({ href: `/watch-order/${f.slug}`, text: `${f.title} watch order` })) },
              ].map((col) =>
                col.list.length > 0 ? (
                  <div key={col.label}>
                    <h3 className="font-display text-xl font-bold">{col.label}</h3>
                    <ul className="mt-2">
                      {col.list.map((l) => (
                        <li key={l.href}>
                          <Link href={l.href} className="inline-flex min-h-11 items-center py-1 font-semibold text-beam underline-offset-4 hover:underline">
                            {l.text}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}
            </div>
          </section>
        )}

        <div className="mt-24">
          <Faq items={ENDING_INDEX_FAQ} title="Using the ending explained guides" />
        </div>

        <section id="request" className="mt-16 max-w-2xl scroll-mt-24 border-t-2 border-ink pt-8" aria-labelledby="request-heading">
          <h2 id="request-heading" className="font-display text-2xl font-bold text-ink">Request an Ending</h2>
          <p className="mt-2 font-body text-base leading-relaxed text-muted">
            Have an anime in mind? Send the title for consideration in a future guide.
          </p>
          <TitleRequestForm />
        </section>
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
