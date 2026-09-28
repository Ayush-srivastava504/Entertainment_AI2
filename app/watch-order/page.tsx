import Link from "next/link";
import { getBaseUrl } from "@/lib/site";
import { getAllPublishedFranchises } from "@/lib/api/franchises";
import { SearchBar } from "@/components/media/SearchBar";
import { PageHero } from "@/components/ui/PageHero";
import { Faq } from "@/components/ui/Faq";
import { CtaBand } from "@/components/ui/CtaBand";
import { WATCH_ORDER_INDEX_FAQ } from "@/lib/faq";
import { WATCH_ORDER_TOPICS } from "@/lib/topics";
import { TopicLinks } from "@/components/topics/TopicLinks";

const BASE_URL = getBaseUrl();

export const metadata = {
  title: "Watch Order Guides | Marquee",
  description:
    "The correct order to watch every franchise: release order, chronological order, or the best-experience recommended order.",
  alternates: { canonical: `${BASE_URL}/watch-order` },
};

export default async function WatchOrderIndexPage() {
  const franchises = await getAllPublishedFranchises();

  return (
    <>
      <PageHero
        kicker="Watch order"
        title="What to watch first, and what next"
        subtitle="Every entry in the order that makes sense, plus why when release order and story order do not agree."
      >
        <SearchBar path="/search" placeholder="Search a franchise" />
      </PageHero>

      <TopicLinks topics={WATCH_ORDER_TOPICS} basePath="/watch-order" />

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
                  {f.mediaType === "anime" ? "Anime" : f.mediaType === "mixed" ? "Movies and anime" : "Movies"}
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
