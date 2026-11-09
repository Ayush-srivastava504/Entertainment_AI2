import type { Metadata } from "next";
import Link from "next/link";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { breadcrumbNode, graph, jsonLdString } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getTrendingLeads } from "@/lib/characters";
import { getDbSlugsByIds } from "@/lib/characters-db";

const BASE_URL = getBaseUrl();

export const revalidate = 3600;
const TITLE = `Main Female Leads of 50 Trending Anime | ${SITE_NAME}`;
const DESCRIPTION =
  "Meet the main female lead of each of the 50 trending anime right now: character profiles, voice actors and the series they star in.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${BASE_URL}/characters/leads` },
};

export default async function TrendingLeadsPage() {
  const { items } = getTrendingLeads();
  // Link straight to each profile's name slug ("/characters/mikasa-ackerman"),
  // not the old id URL, so no internal link goes through a redirect.
  const slugs = await getDbSlugsByIds(items.map((l) => l.character.id));
  const profileHref = (l: (typeof items)[number]) => `/characters/${slugs.get(l.character.id) ?? l.character.slug}`;

  const jsonLd = graph(
    {
      "@type": "ItemList",
      name: "Main female leads of trending anime",
      itemListElement: items.map((l) => ({
        "@type": "ListItem",
        position: l.rank,
        url: `${BASE_URL}${profileHref(l)}`,
        name: `${l.character.name} (${l.anime.title})`,
      })),
    },
    breadcrumbNode([
      { name: "Home", path: "/" },
      { name: "Characters", path: "/characters" },
      { name: "Trending leads", path: "/characters/leads" },
    ])
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />

      <div className="bg-gradient-to-b from-heroFrom to-heroTo">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Characters", href: "/characters" }, { name: "Trending leads" }]} />
          <h1 className="mt-3 font-display text-3xl font-extrabold text-white sm:text-4xl">Female Leads of 50 Trending Anime</h1>
          <p className="mt-2 max-w-2xl text-white/90">{DESCRIPTION}</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {items.length === 0 ? (
          <p className="text-muted">
            No leads yet. Run <code>npm run generate:leads</code> to build this list from the currently trending anime.
          </p>
        ) : (
          <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((l) => (
              <li key={l.character.id}>
                <Link
                  href={profileHref(l)}
                  className="relative block overflow-hidden rounded-2xl border-2 border-ink bg-surface shadow-block transition-transform hover:-translate-y-0.5"
                >
                  <span className="absolute left-2 top-2 z-10 rounded-full border-2 border-ink bg-beam px-2 text-sm font-bold text-white">
                    #{l.rank}
                  </span>
                  {l.character.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.character.image} alt={l.character.name} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                  )}
                  <div className="p-3">
                    <p className="font-semibold leading-tight">{l.character.name}</p>
                    <p className="text-sm text-muted">{l.anime.title}</p>
                    <p className="mt-1 text-sm text-muted">♥ {l.character.favourites.toLocaleString()}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
