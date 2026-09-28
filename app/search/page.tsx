import Link from "next/link";
import { searchSite } from "@/lib/search";
import { SearchBar } from "@/components/media/SearchBar";
import { MediaGrid } from "@/components/media/MediaGrid";
import { PageHero } from "@/components/ui/PageHero";
import { getBaseUrl } from "@/lib/site";

const BASE_URL = getBaseUrl();

export const metadata = {
  title: "Search | Marquee",
  description: "Search ending explained guides and watch order guides by title.",
  alternates: { canonical: `${BASE_URL}/search` },
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query ? await searchSite(query) : null;
  const items = results ? [...results.movies, ...results.anime] : [];
  const hasResults = Boolean(results && (items.length > 0 || results.franchises.length > 0));

  return (
    <>
      <PageHero
        kicker="Search"
        title={query ? `Results for “${query}”` : "Find a guide"}
        subtitle={query ? undefined : "Search ending explained guides and watch order guides by title."}
      >
        <SearchBar initialValue={query} path="/search" size="lg" />
      </PageHero>

      <div className="mx-auto max-w-6xl px-6 py-14">
        {!query && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Link href="/ending-explained" className="rounded-2xl border-2 border-ink bg-surface p-6 transition hover:-translate-y-1 hover:shadow-block">
              <p className="font-display text-2xl font-extrabold">Browse ending explained</p>
              <p className="mt-2 font-body text-muted">Every movie and anime guide, newest first.</p>
            </Link>
            <Link href="/watch-order" className="rounded-2xl border-2 border-ink bg-surface p-6 transition hover:-translate-y-1 hover:shadow-block">
              <p className="font-display text-2xl font-extrabold">Browse watch orders</p>
              <p className="mt-2 font-body text-muted">Franchises in the order that makes sense.</p>
            </Link>
          </div>
        )}

        {query && !hasResults && (
          <div className="rounded-2xl border-2 border-ink bg-surface p-8">
            <p className="font-display text-2xl font-bold">No guides match “{query}”</p>
            <p className="mt-2 font-body text-lg text-muted">
              Check the spelling, try a shorter title, or browse{" "}
              <Link href="/ending-explained" className="font-semibold text-beam underline">ending explained</Link> and{" "}
              <Link href="/watch-order" className="font-semibold text-beam underline">watch order</Link> guides.
            </p>
          </div>
        )}

        {query && items.length > 0 && (
          <section>
            <h2 className="font-display text-3xl font-bold tracking-tight">Ending explained ({items.length})</h2>
            <div className="mt-6">
              <MediaGrid items={items} basePath="/ending-explained" />
            </div>
          </section>
        )}

        {query && results && results.franchises.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-3xl font-bold tracking-tight">Watch order ({results.franchises.length})</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.franchises.map((f) => (
                <Link
                  key={f.id}
                  href={`/watch-order/${f.slug}`}
                  className="group rounded-2xl border-2 border-ink bg-surface p-6 transition hover:-translate-y-1 hover:shadow-block"
                >
                  <h3 className="font-display text-2xl font-extrabold group-hover:text-beam">{f.title} watch order</h3>
                  {f.intro && <p className="mt-2 line-clamp-3 font-body text-muted">{f.intro}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
