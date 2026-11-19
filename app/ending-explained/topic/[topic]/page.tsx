import Link from "next/link";
import { notFound } from "next/navigation";
import { getBaseUrl } from "@/lib/site";
import { fitTitle, INDEX_ROBOTS, NOINDEX_ROBOTS } from "@/lib/seo";
import { socialMeta } from "@/lib/og";
import { getEndingTopicItems, isThinEndingTopic } from "@/lib/api/topic-hubs";
import { MediaGrid } from "@/components/media/MediaGrid";
import { PageHero } from "@/components/ui/PageHero";
import { Faq } from "@/components/ui/Faq";
import { CtaBand } from "@/components/ui/CtaBand";
import { ENDING_TOPICS, findTopic } from "@/lib/topics";

const BASE_URL = getBaseUrl();

export function generateStaticParams() {
  return ENDING_TOPICS.map((topic) => ({ topic: topic.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = await params;
  const topic = findTopic(ENDING_TOPICS, slug);
  if (!topic) return {};
  const thin = await isThinEndingTopic(topic);
  return {
    title: { absolute: fitTitle([`${topic.title}: Ending Explained Guides`, `${topic.title} Explained`, topic.title]) },
    // Too few guides to be a useful hub yet: keep it out of the index.
    robots: thin ? NOINDEX_ROBOTS : INDEX_ROBOTS,
    description: topic.description,
    alternates: { canonical: `${BASE_URL}/ending-explained/topic/${topic.slug}` },
    ...socialMeta({
      title: `${topic.title}: Ending Explained Guides | Animegirl4u`,
      description: topic.description,
      path: `/ending-explained/topic/${topic.slug}`,
      cardTitle: topic.title,
      cardSubtitle: "Ending explained guides",
      badge: "ENDING EXPLAINED",
    }),
  };
}

export default async function EndingTopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = await params;
  const topic = findTopic(ENDING_TOPICS, slug);
  if (!topic) notFound();

  const items = await getEndingTopicItems(topic);

  return (
    <>
      <PageHero kicker="Ending explained topic" title={topic.title} subtitle={topic.description}>
        <Link href="/ending-explained" className="font-bold underline underline-offset-4">
          Browse every ending explained guide
        </Link>
      </PageHero>

      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-beam">What this collection covers</p>
          <p className="mt-3 font-body text-lg leading-relaxed text-muted">
            These guides are spoiler-forward and grounded in the published title data. Read them after watching if you want the final reveal, the confirmed character outcomes, and the strongest supported reading of the ending in one place.
          </p>
        </div>

        {items.length > 0 ? (
          <div className="mt-10">
            <h2 className="font-display text-3xl font-extrabold tracking-tight">Guides in this topic</h2>
            <div className="mt-6">
              <MediaGrid items={items} basePath="/ending-explained" />
            </div>
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border-2 border-ink bg-surface p-8">
            <h2 className="font-display text-2xl font-bold">More guides are on the way</h2>
            <p className="mt-2 text-muted">This topic is ready, but no published guide currently matches its catalog tags.</p>
          </div>
        )}

        <div className="mt-20">
          <Faq items={topic.faq} title={`${topic.title} questions`} />
        </div>
      </div>

      <CtaBand
        title="Need the order first?"
        text="Use a franchise watch order before reading the ending of a later entry."
        primary={{ href: "/watch-order", label: "Browse watch orders" }}
        secondary={{ href: "/ending-explained", label: "All ending guides" }}
      />
    </>
  );
}