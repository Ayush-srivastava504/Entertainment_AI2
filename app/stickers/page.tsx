import type { Metadata } from "next";
import Link from "next/link";
import { searchGifs } from "@/lib/api/gifs";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { breadcrumbNode, graph, jsonLdString, WEBSITE_ID } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { socialMeta } from "@/lib/og";

export const revalidate = 3600;

const DEFAULT_QUERY = "cute anime girl";
const TITLE = `Anime Girl Stickers & GIFs | ${SITE_NAME}`;
const DESCRIPTION = "Browse and download anime girl GIFs and stickers — reactions, chibi, waves, blushes and more.";
const PATH = "/stickers";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${getBaseUrl()}${PATH}` },
  ...socialMeta({ title: TITLE, description: DESCRIPTION, path: PATH, cardTitle: "Anime Girl Stickers & GIFs", cardSubtitle: "Free to download and send", badge: "STICKERS" }),
};

const trendingTags = [
  "cute anime girl",
  "anime wave",
  "anime blush",
  "chibi",
  "anime smile",
  "anime wink",
  "anime dance",
  "anime hug",
];

export default async function StickersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 80) || DEFAULT_QUERY;
  const gifs = await searchGifs(q, 24);
  const BASE_URL = getBaseUrl();

  const pageJsonLd = graph(
    {
      "@type": "CollectionPage",
      "@id": `${BASE_URL}${PATH}#webpage`,
      url: `${BASE_URL}${PATH}`,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": WEBSITE_ID },
      breadcrumb: { "@id": `${BASE_URL}${PATH}#breadcrumb` },
    },
    {
      "@id": `${BASE_URL}${PATH}#breadcrumb`,
      ...breadcrumbNode([
        { name: "Home", path: "/" },
        { name: "Stickers & GIFs", path: PATH },
      ]),
    }
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(pageJsonLd) }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Stickers & GIFs" }]} />

      <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Anime girl stickers &amp; GIFs</h1>
      <p className="mt-2 max-w-2xl text-muted">{DESCRIPTION}</p>

      <form action={PATH} method="get" role="search" className="mt-5 flex max-w-xl gap-2">
        <label htmlFor="gif-q" className="sr-only">
          Search GIFs and stickers
        </label>
        <input
          id="gif-q"
          name="q"
          type="search"
          defaultValue={q === DEFAULT_QUERY ? "" : q}
          placeholder="Search e.g. anime wave, chibi, blush…"
          maxLength={80}
          className="min-h-11 w-full rounded-full border-2 border-ink bg-surface px-4 text-sm"
        />
        <button
          type="submit"
          className="min-h-11 shrink-0 rounded-full bg-beam px-5 text-sm font-bold text-white hover:bg-beamDeep"
        >
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {trendingTags.map((t) => (
          <Link
            key={t}
            href={`${PATH}?q=${encodeURIComponent(t)}`}
            aria-current={t === q ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-sm font-semibold hover:border-beam hover:text-beam ${
              t === q ? "border-beam bg-beam/10 text-beam" : "border-ink/20 bg-surface"
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {gifs.length > 0 && (
        <p className="mt-6 text-sm text-muted">
          {gifs.length} results for &ldquo;{q}&rdquo;
        </p>
      )}

      <div className="mt-3 columns-2 gap-3 sm:columns-3 md:columns-4">
        {gifs.map((g, i) => (
          <div
            key={g.id}
            className="mb-3 break-inside-avoid overflow-hidden rounded-xl border-2 border-ink bg-surface shadow-block"
          >
            <Link href={`/gif/${g.id}`} className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.previewUrl}
                alt={g.title}
                width={g.width}
                height={g.height}
                loading={i < 4 ? "eager" : "lazy"}
                decoding="async"
                className="h-auto w-full"
              />
            </Link>
            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <span className="truncate text-xs font-semibold text-ink/80">{g.title}</span>
              <a
                href={g.fullUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Download ${g.title}`}
                className="shrink-0 rounded-full bg-beam px-2.5 py-1 text-xs font-bold text-white hover:bg-beamDeep"
              >
                ↓
              </a>
            </div>
          </div>
        ))}
      </div>

      {!gifs.length && (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-ink/30 p-8 text-center">
          <p className="font-semibold">No results for &ldquo;{q}&rdquo;.</p>
          <p className="mt-1 text-sm text-muted">Try one of the tags above, or a simpler search like &ldquo;anime wave&rdquo;.</p>
          <Link href={PATH} className="mt-4 inline-block text-sm font-semibold text-beam underline underline-offset-4">
            Reset search
          </Link>
        </div>
      )}

      <p className="mt-10 text-sm text-muted">
        Want still images instead? Browse our{" "}
        <Link href="/wallpapers" className="font-semibold text-beam underline underline-offset-4 hover:text-beamDeep">
          anime girl wallpapers
        </Link>
        .
      </p>
    </div>
  );
}
