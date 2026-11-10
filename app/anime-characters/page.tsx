import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { characterSlug, getTopCharacters, searchCharacters } from "@/lib/characters";
import { getPopularCharacters, getTrendingCharacters, type DbCharacter } from "@/lib/characters-db";
import { socialMeta } from "@/lib/og";
import { breadcrumbNode, graph, jsonLdString, WEBSITE_ID } from "@/lib/jsonld";

function CharacterGrid({ items, rankKey }: { items: DbCharacter[]; rankKey: "trendingRank" | "popularRank" }) {
  return (
    <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((c) => (
        <li key={c.id}>
          <Link
            href={`/anime-characters/${c.slug}`}
            className="block overflow-hidden rounded-2xl border-2 border-ink bg-surface shadow-block transition-transform hover:-translate-y-0.5"
          >
            {c.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.image} alt={c.name} width={230} height={325} loading="lazy" className="aspect-[3/4] w-full object-cover" />
            )}
            <div className="p-3">
              <p className="font-semibold leading-tight">
                <span className="text-beam">#{c[rankKey]}</span> {c.name}
              </p>
              {c.anime[0] && <p className="text-sm text-muted">{c.anime[0].title}</p>}
              <p className="mt-1 text-sm text-muted">♥ {c.favourites.toLocaleString()}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const BASE_URL = getBaseUrl();
const TITLE = `Anime Characters: Profiles & Voice Actors | ${SITE_NAME}`;
const DESCRIPTION =
  "Browse the most loved anime characters: profiles, nicknames, which anime they appear in and who voices them. Search any character.";

type SP = { q?: string; page?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  // ?q= search results and ?page=2..200 are live MyAnimeList listings whose
  // cards link to noindexed fallback profiles. Their canonical pointed at
  // page 1 even though the content differs, which Google ignores and then
  // spends crawl budget on up to 200 near-empty variants.
  const isVariant = !!(sp.q ?? "").trim() || (Number(sp.page) || 1) > 1;
  return {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: { canonical: `${BASE_URL}/anime-characters` },
    ...socialMeta({ title: TITLE, description: DESCRIPTION, path: "/anime-characters", cardTitle: "Anime Characters", cardSubtitle: "Profiles, voice actors and the most loved characters", badge: "CHARACTERS" }),
    robots: isVariant ? { index: false, follow: true } : undefined,
  };
}

export default async function CharactersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Math.min(200, Number(sp.page) || 1));
  const [trending, popular] = !q && page === 1 ? await Promise.all([getTrendingCharacters(60), getPopularCharacters(100)]) : [[], []];

  const pageUrl = `${BASE_URL}/anime-characters`;
  const jsonLd = graph(
    {
      "@type": "CollectionPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": WEBSITE_ID },
      breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
    },
    {
      "@id": `${pageUrl}#breadcrumb`,
      ...breadcrumbNode([
        { name: "Home", path: "/" },
        { name: "Characters", path: "/anime-characters" },
      ]),
    }
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <div className="bg-gradient-to-b from-heroFrom to-heroTo">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Characters" }]} />
          <h1 className="mt-3 font-display text-3xl font-extrabold text-white sm:text-4xl">Anime Characters</h1>
          <p className="mt-2 max-w-2xl text-white/90">{DESCRIPTION}</p>
          <form action="/anime-characters" className="mt-5 flex max-w-xl gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search a character, e.g. Zero Two"
              aria-label="Search characters"
              className="min-h-11 flex-1 rounded-full border-2 border-ink bg-surface px-4 text-ink"
            />
            <button className="min-h-11 rounded-full border-2 border-ink bg-beam px-5 font-semibold text-white hover:bg-beamDeep">
              Search
            </button>
          </form>
          <Link href="/anime-characters/leads" className="mt-4 inline-block font-semibold text-white underline">
            Female leads of 50 trending anime →
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {trending.length > 0 && (
          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold">Trending anime characters</h2>
            <p className="mt-1 text-muted">Main characters of the anime everyone is watching right now.</p>
            <CharacterGrid items={trending} rankKey="trendingRank" />
          </section>
        )}
        {popular.length > 0 && (
          <section className="mb-12">
            <h2 className="font-display text-2xl font-bold">Top 100 most loved anime characters</h2>
            <p className="mt-1 text-muted">Ranked by how many fans have favourited them.</p>
            <CharacterGrid items={popular} rankKey="popularRank" />
          </section>
        )}
        <h2 className="font-display text-xl font-bold">{q ? `Results for “${q}”` : popular.length ? "Browse more characters" : "Most loved characters"}</h2>

        <Suspense fallback={<CharacterGridSkeleton />}>
          <BrowseCharacters q={q} page={page} />
        </Suspense>
      </div>
    </>
  );
}

function CharacterGridSkeleton() {
  return (
    <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="overflow-hidden rounded-2xl border-2 border-ink bg-surface">
          <div className="aspect-[3/4] w-full animate-pulse bg-fog" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-fog" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-fog" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Live MyAnimeList (Jikan) results. Streamed so a slow API never blocks the page. */
async function BrowseCharacters({ q, page }: { q: string; page: number }) {
  const data = q ? await searchCharacters(q, page) : await getTopCharacters(page);
  const href = (p: number) => `/anime-characters?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  if (data.items.length === 0) {
    return <p className="mt-6 text-muted">No characters found{q ? " — try another spelling." : " right now. Please try again shortly."}</p>;
  }
  return (
    <>
      <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {data.items.map((c) => (
          <li key={c.id}>
            <Link
              href={`/anime-characters/${characterSlug(c)}`}
              className="block overflow-hidden rounded-2xl border-2 border-ink bg-surface shadow-block transition-transform hover:-translate-y-0.5"
            >
              {c.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt={c.name} loading="lazy" className="aspect-[3/4] w-full object-cover" />
              )}
              <div className="p-3">
                <p className="font-semibold leading-tight">{c.name}</p>
                {c.nameKanji && <p className="text-sm text-muted">{c.nameKanji}</p>}
                <p className="mt-1 text-sm text-muted">♥ {c.favorites.toLocaleString()}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex items-center justify-between">
        {page > 1 ? (
          <Link href={href(page - 1)} className="inline-flex min-h-11 items-center rounded-full border-2 border-ink px-5 font-semibold hover:bg-tape">
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        {data.hasNext && (
          <Link href={href(page + 1)} className="inline-flex min-h-11 items-center rounded-full border-2 border-ink px-5 font-semibold hover:bg-tape">
            Next →
          </Link>
        )}
      </div>
    </>
  );
}
