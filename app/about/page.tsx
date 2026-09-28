import Link from "next/link";
import { getBaseUrl } from "@/lib/site";
import { PageHero } from "@/components/ui/PageHero";
import { Faq } from "@/components/ui/Faq";
import { CtaBand } from "@/components/ui/CtaBand";

const BASE_URL = getBaseUrl();

export const metadata = {
  title: "About Marquees | Marquee",
  description: "Learn about Marquee's movie and anime guides, how they are made, and what is coming next.",
  alternates: { canonical: `${BASE_URL}/about` },
};

const aboutTopics = [
  {
    title: "A Guide to Movies and Anime",
    text: "Marquee brings movie and anime guides together, with clear explanations for stories you have finished and practical watch orders for franchises you are about to start.",
  },
  {
    title: "Helping You Finish Stories With Confidence",
    text: "When the final scenes leave questions behind, an ending explained guide walks through what happened and the meaning the story gives it.",
  },
  {
    title: "Helping You Start Franchises in the Right Place",
    text: "Watch order guides help you choose where to begin, how entries connect, and which order best suits a first-time viewing.",
  },
];

const endingTopics = [
  {
    title: "What an Ending Explained Guide Covers",
    text: "Each guide brings together a recap, an explanation of the ending, its meaning, and answers to common questions, alongside quick facts and title details.",
  },
  {
    title: "Recap, Ending, and Meaning",
    text: "Start with the story context, then read what happens in the final scenes and how to understand them. The ending is spoiler-forward, so it is kept behind a reveal control on each guide.",
  },
  {
    title: "When an Ending Needs More Explanation",
    text: "Some endings leave a mystery open or invite more than one interpretation. Guides distinguish what the story shows from the meaning readers may take away, rather than presenting every question as settled.",
  },
];

const endingFaq = [
  {
    q: "Are ending explained guides spoiler-free?",
    a: "No. These guides discuss the ending directly. The ending section is hidden behind a spoiler control so you can choose when to reveal it.",
  },
  {
    q: "Do the guides explain what an ending means?",
    a: "They cover what happens and the context behind it, then explain the ending's meaning where the story supports a clear reading.",
  },
];

const watchOrderTopics = [
  {
    title: "Finding the Right Order for a Franchise",
    text: <>Browse a franchise guide to see its entries together and choose an order that makes sense for your first watch or rewatch. <Link className="font-semibold text-beam underline underline-offset-4" href="/watch-order">Browse watch orders</Link>.</>,
  },
  {
    title: "Release Order vs. Story Order",
    text: "Release order follows when each entry came out; story order follows its in-world timeline. Release order is often safest for first-time viewers, and guides explain when another order may work better.",
  },
  {
    title: "Why Watch Order Can Matter",
    text: "The sequence can shape when you learn key details, recognize returning characters, and experience reveals. The recommended order aims to keep those story choices intact.",
  },
  {
    title: "Notes and Context for Each Franchise",
    text: "Each order includes context for how its entries fit together and where release and story chronology differ, so you can make an informed choice about what to watch.",
  },
];

const discoveryTopics = [
  {
    title: "Search for Any Title",
    text: <>Look up a movie or anime by name on the <Link className="font-semibold text-beam underline underline-offset-4" href="/search">search page</Link>. Results take you to available title guides.</>,
  },
  {
    title: "Explore Franchise Guides",
    text: <>Use <Link className="font-semibold text-beam underline underline-offset-4" href="/watch-order">watch order guides</Link> to explore franchise entries and find a recommended starting point.</>,
  },
  {
    title: "Find Available Guides",
    text: <>Browse <Link className="font-semibold text-beam underline underline-offset-4" href="/ending-explained">ending explained guides</Link> or franchise orders to see what is currently available. If a title has no guide yet, it has not been published in the library.</>,
  },
  {
    title: "Discover What to Watch Next",
    text: "Follow a title into its franchise guide to see what connects to it and decide what belongs on your next watch list.",
  },
];

const creationTopics = [
  {
    title: "Starting With Factual Data",
    text: "Movie details and cast are drawn from TMDB, while anime details come from public anime databases. This provides a factual starting point for each guide.",
  },
  {
    title: "Original Editorial Writing",
    text: "Guide explanations are written in original language around each title's data, aiming to make the important story details clear and easy to follow.",
  },
  {
    title: "The Role of AI in Guide Creation",
    text: "AI helps draft ending explanations from catalog facts. It is a writing aid, not a substitute for checking the source details and the resulting guide.",
  },
  {
    title: "Length and Quality Checks",
    text: "Ending guides must meet a minimum-length check before publication. Checks help ensure a guide has enough substance to be useful.",
  },
  {
    title: "Human Review for Watch Orders",
    text: "Watch orders are drafted from release-date data and stay unpublished until a person reviews and approves them. A misleading order can spoil a first watch.",
  },
];

const communityTopics = [
  { title: "Likes Without an Account", text: "Like a title without signing up. Your like is stored in this browser." },
  { title: "Saving Titles in Your Browser", text: "Save titles to return to later. Saved titles stay in your browser, so they are not shared across devices." },
  { title: "How Comments Work", text: "Comments let readers discuss a guide or point out something that needs attention. No account is required." },
  { title: "Comment Moderation", text: "Comments may be reviewed and removed through moderation. If you find a factual mistake, describe it on the relevant guide so it can be checked." },
];

const nextTopics = [
  { title: "Expanding the Guide Library", text: "Add more ending explained and watch order guides across movies, anime, and franchises." },
  { title: "Improving Movie and Anime Discovery", text: "Make it easier to find titles and guides that match what you want to watch." },
  { title: "More Franchise and Story Guides", text: "Build more connections between franchise viewing orders and the stories within them." },
  { title: "Improving the Reading Experience", text: "Keep refining readability, navigation, and the experience on every screen." },
];

function TopicList({ topics }: { topics: { title: string; text: React.ReactNode }[] }) {
  return (
    <div className="mt-8 space-y-8">
      {topics.map((topic) => (
        <div key={topic.title}>
          <h3 className="font-display text-xl font-bold text-ink">{topic.title}</h3>
          <p className="mt-3 max-w-3xl font-body text-base leading-relaxed text-muted">{topic.text}</p>
        </div>
      ))}
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <PageHero
        kicker="About"
        title="About Marquees"
        subtitle="Endings, explained. Franchises, in order."
      />

      <main className="mx-auto max-w-6xl space-y-16 px-6 py-16">
        <section className="scroll-mt-24 border-t-2 border-ink pt-10">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink">What Is Marquees?</h2>
          <TopicList topics={aboutTopics} />
        </section>

        <section className="scroll-mt-24 border-t-2 border-ink pt-10">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink">Ending Explained Guides</h2>
          <TopicList topics={endingTopics.slice(0, 2)} />
          <div className="mt-8">
            <Faq items={endingFaq} title="Frequently Asked Questions" id="ending-guide-faq" headingLevel={3} />
          </div>
          <TopicList topics={endingTopics.slice(2)} />
        </section>

        <section className="scroll-mt-24 border-t-2 border-ink pt-10">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink">Watch Order Guides</h2>
          <TopicList topics={watchOrderTopics} />
        </section>

        <section className="scroll-mt-24 border-t-2 border-ink pt-10">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink">Finding Movies, Anime, and Franchises</h2>
          <TopicList topics={discoveryTopics} />
        </section>

        <section className="scroll-mt-24 border-t-2 border-ink pt-10">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink">How Marquees Guides Are Created</h2>
          <TopicList topics={creationTopics} />
        </section>

        <section className="scroll-mt-24 border-t-2 border-ink pt-10">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink">Likes, Saved Titles, and Comments</h2>
          <TopicList topics={communityTopics} />
        </section>

        <section className="scroll-mt-24 border-t-2 border-ink pt-10">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink">What Is Marquees Building Next?</h2>
          <TopicList topics={nextTopics} />
        </section>
      </main>

      <CtaBand
        title="Found a mistake?"
        text="Open the guide and leave a comment describing what is wrong. Corrections are made after review."
        primary={{ href: "/ending-explained", label: "Open a guide" }}
      />
    </>
  );
}
