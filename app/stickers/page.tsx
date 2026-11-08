import type { Metadata } from "next";
import Link from "next/link";
import { searchGifs } from "@/lib/api/gifs";
import { getBaseUrl, SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

const TITLE = `Anime Girl Stickers & GIFs | ${SITE_NAME}`;
const DESCRIPTION = "Browse and download anime girl GIFs and stickers — reactions, chibi, waves, blushes and more.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${getBaseUrl()}/stickers` },
};

const trendingTags = [
  "cute anime girl",
  "anime wave",
  "anime blush",
  "chibi",
  "anime smile",
  "anime wink",
];

export default async function StickersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim() || "cute anime girl";
  const gifs = await searchGifs(q, 24);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Anime girl stickers &amp; GIFs</h1>
      <p className="mt-2 max-w-2xl text-muted">{DESCRIPTION}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {trendingTags.map((t) => (
          <Link
            key={t}
            href={`/stickers?q=${encodeURIComponent(t)}`}
            className="rounded-full border border-ink/20 bg-surface px-3 py-1 text-sm font-semibold hover:border-beam hover:text-beam"
          >
            {t}
          </Link>
        ))}
      </div>

      <div className="mt-8 columns-2 gap-3 sm:columns-3 md:columns-4">
        {gifs.map((g) => (
          <Link
            key={g.id}
            href={`/gif/${g.id}`}
            className="mb-3 block break-inside-avoid overflow-hidden rounded-xl border-2 border-ink bg-surface shadow-block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.previewUrl} alt={g.title} loading="lazy" className="w-full h-auto" />
          </Link>
        ))}
        {!gifs.length && <p className="text-muted">No results for &ldquo;{q}&rdquo;.</p>}
      </div>
    </div>
  );
}
