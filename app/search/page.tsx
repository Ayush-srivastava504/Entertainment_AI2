import Link from "next/link";
import { searchSite } from "@/lib/search";
import { SearchBar } from "@/components/media/SearchBar";
import { MediaGrid } from "@/components/media/MediaGrid";
import { getBaseUrl } from "@/lib/site";

const BASE_URL = getBaseUrl();

export const metadata = {
  title: "Search | Marquee",
  description: "Search Ending Explained guides and Watch Order guides by title.",
  alternates: { canonical: `${BASE_URL}/search` },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query ? await searchSite(query) : null;
  const items = results ? [...results.movies, ...results.anime] : [];
  const hasResults = Boolean(results && (items.length > 0 || results.franchises.length > 0));

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">🔎 SEARCH</p>
      <h1 className="mt-3 font-display text-3xl sm:text-5xl text-marquee-text">Search Marquee</h1>
      <p className="mt-4 max-w-2xl text-marquee-textDim">
        Find an Ending Explained guide or a Watch Order guide by title.
      </p>

      <div className="mt-8 max-w-xl">
        <SearchBar initialValue={query} path="/search" />
      </div>

      {!query && (
        <div className="mt-10 flex gap-4">
          <Link href="/ending-explained" className="rounded border border-marquee-line px-4 py-2 text-marquee-text">
            Browse Ending Explained
          </Link>
          <Link href="/watch-order" className="rounded border border-marquee-line px-4 py-2 text-marquee-text">
            Browse Watch Order
          </Link>
        </div>
      )}

      {query && !hasResults && (
        <p className="mt-10 text-marquee-textDim">
          No guides matched &ldquo;{query}&rdquo;. Try a different title, or browse{" "}
          <Link href="/ending-explained" className="text-marquee-gold hover:underline">
            Ending Explained
          </Link>{" "}
          and{" "}
          <Link href="/watch-order" className="text-marquee-gold hover:underline">
            Watch Order
          </Link>{" "}
          guides.
        </p>
      )}

      {query && items.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-2xl text-marquee-text">Ending Explained</h2>
          <div className="mt-5">
            <MediaGrid items={items} basePath="/ending-explained" />
          </div>
        </div>
      )}

      {query && results && results.franchises.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display text-2xl text-marquee-text">Watch Order</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {results.franchises.map((f) => (
              <Link
                key={f.id}
                href={`/watch-order/${f.slug}`}
                className="ticket block p-5 pl-8 transition hover:border-marquee-gold"
              >
                <h3 className="font-display text-xl text-marquee-text">{f.title}</h3>
                {f.intro && <p className="mt-2 text-sm text-marquee-textDim line-clamp-2">{f.intro}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
