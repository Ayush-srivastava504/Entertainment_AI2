import Link from "next/link";
import { notFound } from "next/navigation";
import { getBaseUrl } from "@/lib/site";
import { getAllPublishedFranchises } from "@/lib/api/franchises";
import { PageHero } from "@/components/ui/PageHero";
import { Faq } from "@/components/ui/Faq";
import { CtaBand } from "@/components/ui/CtaBand";
import { WATCH_ORDER_TOPICS, findTopic, matchesFranchiseTopic } from "@/lib/topics";

const BASE_URL = getBaseUrl();

export function generateStaticParams() {
  return WATCH_ORDER_TOPICS.map((topic) => ({ topic: topic.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = await params;
  const topic = findTopic(WATCH_ORDER_TOPICS, slug);
  if (!topic) return {};
  return {
    title: `${topic.title}: Watch Order Guides`,
    description: topic.description,
    alternates: { canonical: `${BASE_URL}/watch-order/topic/${topic.slug}` },
  };
}

export default async function WatchOrderTopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = await params;
  const topic = findTopic(WATCH_ORDER_TOPICS, slug);
  if (!topic) notFound();

  const franchises = (await getAllPublishedFranchises()).filter((franchise) => matchesFranchiseTopic(franchise, topic));

  return (
    <>
      <PageHero kicker="Watch order topic" title={topic.title} subtitle={topic.description}>
        <Link href="/watch-order" className="font-bold underline underline-offset-4">
          Browse every watch order guide
        </Link>
      </PageHero>

      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-beam">How to use this collection</p>
          <p className="mt-3 font-body text-lg leading-relaxed text-muted">
            Start with the guide that matches your franchise, then follow its numbered route and notes. Each page explains whether its recommendation protects release-order surprises, clarifies chronology, or balances both for a first watch.
          </p>
        </div>

        {franchises.length > 0 ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {franchises.map((franchise) => (
              <Link
                key={franchise.id}
                href={`/watch-order/${franchise.slug}`}
                className="group flex flex-col rounded-2xl border-2 border-ink bg-surface p-6 transition hover:-translate-y-1 hover:shadow-block"
              >
                <span className="w-fit rounded-full border-2 border-ink bg-tape px-2.5 py-0.5 text-xs font-bold">
                  {franchise.mediaType === "anime" ? "Anime" : franchise.mediaType === "mixed" ? "Movies and anime" : "Movies"}
                </span>
                <h2 className="mt-4 font-display text-2xl font-extrabold leading-tight group-hover:text-beam">
                  {franchise.title} watch order
                </h2>
                {franchise.intro && <p className="mt-3 line-clamp-4 text-base leading-relaxed text-muted">{franchise.intro}</p>}
                <span className="mt-auto pt-5 text-sm font-bold text-beam">Open guide -&gt;</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border-2 border-ink bg-surface p-8">
            <h2 className="font-display text-2xl font-bold">More guides are on the way</h2>
            <p className="mt-2 text-muted">This topic is ready, but no published franchise currently matches its catalog tags.</p>
          </div>
        )}

        <div className="mt-20">
          <Faq items={topic.faq} title={`${topic.title} questions`} />
        </div>
      </div>

      <CtaBand
        title="Finished one entry?"
        text="Read its ending explained before you decide what to watch next."
        primary={{ href: "/ending-explained", label: "Browse ending guides" }}
        secondary={{ href: "/watch-order", label: "All watch orders" }}
      />
    </>
  );
}