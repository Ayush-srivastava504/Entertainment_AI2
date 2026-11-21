import Link from "next/link";
import { getBaseUrl } from "@/lib/site";
import { getAllPublishedFranchises } from "@/lib/api/franchises";
import { isWatchOrderHubEmpty } from "@/lib/api/topic-hubs";
import { SearchBar } from "@/components/media/SearchBar";
import { PageHero } from "@/components/ui/PageHero";
import { Faq } from "@/components/ui/Faq";
import { CtaBand } from "@/components/ui/CtaBand";
import { WATCH_ORDER_INDEX_FAQ } from "@/lib/faq";
import { TopicLinks } from "@/components/topics/TopicLinks";
import { socialMeta } from "@/lib/og";
import { breadcrumbNode, graph, jsonLdString } from "@/lib/jsonld";
import { INDEX_ROBOTS } from "@/lib/seo";
import { redirect } from "next/navigation";
import { getIndexableWatchOrderTopics } from "@/lib/api/topic-hubs";

export const revalidate = 3600;

const BASE_URL = getBaseUrl();

// An empty hub ("No watch order guides yet") is a thin page. Until at least
// one anime watch order is published it temporarily redirects (307) to the
// ending explained hub, so the ~10 links to /watch-order around the site
// still land on real content; the nav, footer and sitemap leave it out by
// the same rule. isWatchOrderHubEmpty() is false on a DB error, so a blip
// never redirects a hub that has guides.
export async function generateMetadata() {
  if (await isWatchOrderHubEmpty()) redirect("/ending-explained");
  return { ...metadata, robots: INDEX_ROBOTS };
}

const metadata = {
  title: "Anime Watch Order Guides",
  description:
    "The correct order to watch every anime franchise: release order, chronological order, and the recommended order for first-timers.",
  alternates: { canonical: `${BASE_URL}/watch-order` },
  ...socialMeta({ title: "Anime Watch Order Guides | Animegirl4u", description: "The correct order to watch every anime franchise: release order, chronological order, and the recommended order for first-timers.", path: "/watch-order", cardTitle: "Watch Order Guides", cardSubtitle: "Release, chronological and recommended order for every franchise", badge: "WATCH ORDER" }),
};

export default async function WatchOrderIndexPage() {
  if (await isWatchOrderHubEmpty()) redirect("/ending-explained");
  const [franchises, topics] = await Promise.all([
    getAllPublishedFranchises(),
    getIndexableWatchOrderTopics().catch(() => []),
  ]);

  // CollectionPage + ItemList + breadcrumb, matching the ending explained hub.
  const hubUrl = `${BASE_URL}/watch-order`;
  const hubLd = graph(
    {
      "@type": "CollectionPage",
      "@id": `${hubUrl}#webpage`,
      url: hubUrl,
      name: "Anime Watch Order Guides",
      inLanguage: "en",
      isPartOf: { "@id": `${BASE_URL}/#website` },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: franchises.length,
        itemListElement: franchises.map((f, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${BASE_URL}/watch-order/${f.slug}`,
          name: `${f.title} watch order`,
        })),
      },
    },
    breadcrumbNode([
      { name: "Home", path: "/" },
      { name: "Watch Order", path: "/watch-order" },
    ])
  );

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdString(hubLd) }}
      />
      <PageHero
        kicker="Watch order"
        title="What to watch first, and what next"
        subtitle="Every entry in the order that makes sense, plus why when release order and story order do not agree."
      >
        <SearchBar path="/search" placeholder="Search a franchise" />
      </PageHero>

      <TopicLinks topics={topics} basePath="/watch-order" />

      <div className="mx-auto max-w-6xl px-6 py-14">
        {franchises.length === 0 ? (
          <div className="rounded-2xl border-2 border-ink bg-surface p-8">
            <p className="font-display text-2xl font-bold">No watch order guides yet</p>
            <p className="mt-2 font-body text-muted">
              They are published after review. Meanwhile, read the{" "}
              <Link href="/ending-explained" className="font-semibold text-beam underline">
                ending explained guides
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {franchises.map((f) => (
              <Link
                key={f.id}
                href={`/watch-order/${f.slug}`}
                className="group flex flex-col rounded-2xl border-2 border-ink bg-surface p-6 transition hover:-translate-y-1 hover:shadow-block"
              >
                <span className="w-fit rounded-full border-2 border-ink bg-tape px-2.5 py-0.5 text-xs font-bold">
                  Anime
                </span>
                <h2 className="mt-4 font-display text-2xl font-extrabold leading-tight group-hover:text-beam">
                  {f.title} watch order
                </h2>
                {f.intro && <p className="mt-3 line-clamp-4 font-body text-base leading-relaxed text-muted">{f.intro}</p>}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-24">
          <Faq items={WATCH_ORDER_INDEX_FAQ} title="Watch order questions" />
        </div>
      </div>

      <CtaBand
        title="Just finished an entry?"
        text="Read what its ending meant before you start the next one."
        primary={{ href: "/ending-explained", label: "Ending explained guides" }}
        secondary={{ href: "/search", label: "Search by title" }}
      />
    </>
  );
}
