import Link from "next/link";
import { notFound } from "next/navigation";
import { getBaseUrl } from "@/lib/site";
import { countGuides, getGuidesPage, GUIDES_PER_PAGE, type GuideType } from "@/lib/api/guides";
import { Pagination } from "@/components/ui/Pagination";
import type { Metadata } from "next";
import { MediaGrid } from "@/components/media/MediaGrid";
import { SearchBar } from "@/components/media/SearchBar";
import { PageHero } from "@/components/ui/PageHero";
import { Faq } from "@/components/ui/Faq";
import { CtaBand } from "@/components/ui/CtaBand";
import { ENDING_INDEX_FAQ } from "@/lib/faq";
import { ENDING_TOPICS } from "@/lib/topics";
import { TopicLinks } from "@/components/topics/TopicLinks";

export const revalidate = 3600;

const BASE_URL = getBaseUrl();

type SearchParams = Promise<{ type?: string; page?: string }>;

function parse(sp: { type?: string; page?: string }) {
  const active: GuideType = sp.type === "movie" || sp.type === "anime" ? sp.type : "all";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  return { active, page };
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { active, page } = parse(await searchParams);
  const qs = new URLSearchParams();
  if (active !== "all") qs.set("type", active);
  if (page > 1) qs.set("page", String(page));
  const canonical = `${BASE_URL}/ending-explained${qs.toString() ? `?${qs}` : ""}`;
  const label = active === "movie" ? "Movie " : active === "anime" ? "Anime " : "";
  return {
    title: `${label}Ending Explained Guides${page > 1 ? `, Page ${page}` : ""}`,
    description:
      "Spoiler-forward breakdowns of how your favorite movies and anime actually end: a recap, the final scene explained, what it means, and a quick FAQ for each title.",
    alternates: { canonical },
    // Filtered views are subsets of the main list: keep them out of the index
    // but let crawlers follow every link on them.
    robots: active !== "all" ? { index: false, follow: true } : undefined,
  };
}

const filters = [
  { key: "all", label: "All" },
  { key: "movie", label: "Movies" },
  { key: "anime", label: "Anime" },
] as const;

export default async function EndingExplainedIndexPage({ searchParams }: { searchParams: SearchParams }) {
  const { active, page } = parse(await searchParams);

  const total = await countGuides(active);
  const totalPages = Math.max(1, Math.ceil(total / GUIDES_PER_PAGE));
  if (page > totalPages) notFound();
  const items = await getGuidesPage(active, page);

  return (
    <>
      <PageHero
        kicker="Ending explained"
        title="Every ending, actually explained"
        subtitle="How movies and anime end: a recap, the ending itself, what it means, and the questions people search for most."
      >
        <SearchBar path="/search" />
      </PageHero>

      <TopicLinks topics={ENDING_TOPICS} basePath="/ending-explained" />

      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Filter guides">
          {filters.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/ending-explained" : `/ending-explained?type=${f.key}`}
              aria-current={active === f.key ? "true" : undefined}
              className={`rounded-full border-2 border-ink px-5 py-2 font-bold transition ${
                active === f.key ? "bg-ink text-white" : "bg-surface hover:bg-tape"
              }`}
            >
              {f.label}
            </Link>
          ))}
          <p className="ml-auto text-sm font-semibold text-muted">{total.toLocaleString("en-US")} guides, page {page} of {totalPages}</p>
        </div>

        {items.length === 0 ? (
          <div className="mt-10 rounded-2xl border-2 border-ink bg-surface p-8">
            <p className="font-display text-2xl font-bold">No guides here yet</p>
            <p className="mt-2 font-body text-muted">
              Try another filter, or{" "}
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

        <div className="mt-24">
          <Faq items={ENDING_INDEX_FAQ} title="Using the ending explained guides" />
        </div>
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
