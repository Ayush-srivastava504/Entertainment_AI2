import type { Metadata } from "next";
import Link from "next/link";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { buildOgImageUrl } from "@/lib/og";
import { ABOUT_FAQ } from "@/lib/faq";
import { breadcrumbNode, graph, jsonLdString, ORG_ID, WEBSITE_ID } from "@/lib/jsonld";
import { PageHero } from "@/components/ui/PageHero";
import { Faq } from "@/components/ui/Faq";
import { CtaBand } from "@/components/ui/CtaBand";

const BASE_URL = getBaseUrl();
const PATH = "/about";
const TITLE = `About ${SITE_NAME}: How We Explain Endings and Order Franchises`;
const DESCRIPTION =
  "Meet Marquee: plain-English ending explained guides for movies and anime, franchise watch orders, and a clear look at how every guide is researched, drafted, checked and corrected.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${BASE_URL}${PATH}` },
  openGraph: {
    type: "website",
    url: `${BASE_URL}${PATH}`,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: buildOgImageUrl({ title: `About ${SITE_NAME}`, subtitle: "Endings, explained. Franchises, in order.", badge: "ABOUT" }),
        width: 1200,
        height: 630,
        alt: `About ${SITE_NAME}`,
      },
    ],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

type Topic = { title: string; text: React.ReactNode };
type Section = { id: string; nav: string; heading: string; intro?: string; topics: Topic[] };

const linkClass = "font-semibold text-beam underline underline-offset-4";

const sections: Section[] = [
  {
    id: "what-is-marquee",
    nav: "What we do",
    heading: "What Is Marquee?",
    intro:
      "Marquee exists for the moment the credits roll and the questions start. We explain how movies and anime end, and we tell you where to begin when a franchise has more entries than you can count.",
    topics: [
      {
        title: "One place for finales and first steps",
        text: "Ending explained guides help when you have just finished a story. Watch order guides help when you are about to start one. Both live here so the same site can take you from the first episode to the last scene.",
      },
      {
        title: "Written for real viewers",
        text: "Every guide uses plain language, short sections and a clear order: recap, ending, meaning, then answers. You should never need a second tab to decode the guide itself.",
      },
    ],
  },
  {
    id: "ending-explained",
    nav: "Ending guides",
    heading: "Ending Explained Guides",
    topics: [
      {
        title: "What each guide covers",
        text: (
          <>
            Each guide brings together a recap, an explanation of the ending, what it means, and answers to common
            questions, alongside quick facts and title details. Browse them all in{" "}
            <Link className={linkClass} href="/ending-explained">
              ending explained guides
            </Link>
            .
          </>
        ),
      },
      {
        title: "Spoilers are a choice",
        text: "The recap is spoiler-light. The ending itself is spoiler-forward, so it stays behind a reveal control on every guide. You decide when the story is over for you.",
      },
      {
        title: "Facts first, interpretation second",
        text: "Some endings close every thread and others invite argument. Guides separate what the story shows from what viewers may read into it, so an open ending is never passed off as settled.",
      },
    ],
  },
  {
    id: "watch-order",
    nav: "Watch orders",
    heading: "Watch Order Guides",
    topics: [
      {
        title: "Release order or story order?",
        text: "Release order follows when each entry came out. Story order follows the in-world timeline. First-time viewers are usually safest with release order, and each guide explains when another route works better.",
      },
      {
        title: "Why the sequence matters",
        text: "Order decides when you learn a secret, recognize a returning face or feel a reveal land. A recommended order protects those moments instead of leaving them to chance.",
      },
      {
        title: "Notes for every franchise",
        text: (
          <>
            Each order explains how entries fit together and where release and story chronology part ways, so you
            can choose what to watch with confidence. Start with{" "}
            <Link className={linkClass} href="/watch-order">
              watch order guides
            </Link>
            .
          </>
        ),
      },
    ],
  },
  {
    id: "find-titles",
    nav: "Finding titles",
    heading: "Finding Movies, Anime, and Franchises",
    topics: [
      {
        title: "Search by title",
        text: (
          <>
            Look up a movie or anime by name on the{" "}
            <Link className={linkClass} href="/search">
              search page
            </Link>
            . Results take you straight to the guides that exist.
          </>
        ),
      },
      {
        title: "When a title is missing",
        text: "If a title has no guide yet, it has not been published. Send it through the Request an Ending form on the home page and it will be considered for a future guide.",
      },
      {
        title: "Follow the connections",
        text: "Open a title's franchise guide to see what connects to it, then decide what belongs on your next watch list.",
      },
    ],
  },
  {
    id: "how-guides-are-made",
    nav: "How guides are made",
    heading: "How Marquee Guides Are Created",
    intro: "A guide is only useful if you can trust it, so here is exactly how ours are made.",
    topics: [
      {
        title: "Factual data comes first",
        text: "Movie details and cast are drawn from TMDB. Anime details come from public anime databases. That gives each guide a factual base before any writing starts.",
      },
      {
        title: "AI drafts, checks decide",
        text: "AI helps draft ending explanations from catalog facts. It is a writing aid, not a replacement for checking. Every ending guide must also pass a minimum-length check before it is published.",
      },
      {
        title: "People approve watch orders",
        text: "Watch orders are drafted from release-date data and stay unpublished until a person reviews and approves them, because a misleading order can spoil a first watch.",
      },
      {
        title: "Corrections are welcome",
        text: "Found a mistake? Describe it in a comment on the guide. Reports are reviewed and guides are corrected when needed.",
      },
    ],
  },
  {
    id: "your-data",
    nav: "Likes and comments",
    heading: "Likes, Saved Titles, and Comments",
    topics: [
      { title: "No account needed", text: "Like a title or save it for later without signing up. Likes and saved titles live in your own browser, so they do not follow you to another device." },
      { title: "Comments and moderation", text: "Comments are open without an account. They may be reviewed and removed through moderation, and factual corrections are checked against the guide." },
    ],
  },
  {
    id: "next",
    nav: "What is next",
    heading: "What Is Marquee Building Next?",
    topics: [
      { title: "More guides", text: "More ending explained and watch order guides across movies, anime and franchises." },
      { title: "Better discovery", text: "Easier ways to find the titles and guides that match what you want to watch." },
      { title: "A smoother read", text: "Steady improvements to readability, navigation and the experience on every screen size." },
    ],
  },
];

const values = [
  { title: "Clarity", quote: "If a guide needs decoding, the guide has failed." },
  { title: "Respect for the first watch", quote: "Nobody gets to watch a story for the first time twice." },
  { title: "Honesty about uncertainty", quote: "An open ending should stay open on the page too." },
];

const pageJsonLd = graph(
  {
    "@type": "AboutPage",
    "@id": `${BASE_URL}${PATH}#webpage`,
    url: `${BASE_URL}${PATH}`,
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORG_ID },
    mainEntity: { "@id": ORG_ID },
    breadcrumb: { "@id": `${BASE_URL}${PATH}#breadcrumb` },
  },
  { "@id": `${BASE_URL}${PATH}#breadcrumb`, ...breadcrumbNode([
    { name: "Home", path: "/" },
    { name: "About", path: PATH },
  ]) }
);

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdString(pageJsonLd) }}
      />

      <PageHero
        kicker="About"
        title={`About ${SITE_NAME}`}
        subtitle="Endings, explained. Franchises, in order. Here is who we are, what we publish and how we keep it accurate."
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <nav aria-label="On this page" className="rounded-2xl border-2 border-ink bg-surface p-5">
          <p className="font-display text-lg font-bold">On this page</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="inline-flex min-h-[44px] items-center rounded-full border-2 border-ink px-4 py-2 text-sm font-semibold hover:bg-tape"
                >
                  {s.nav}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#faq"
                className="inline-flex min-h-[44px] items-center rounded-full border-2 border-ink px-4 py-2 text-sm font-semibold hover:bg-tape"
              >
                FAQ
              </a>
            </li>
          </ul>
        </nav>

        <div className="mt-12 space-y-14 sm:space-y-16">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-heading`}
              className="scroll-mt-24 border-t-2 border-ink pt-10"
            >
              <h2 id={`${section.id}-heading`} className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {section.heading}
              </h2>
              {section.intro && (
                <p className="mt-4 max-w-3xl font-body text-lg leading-relaxed text-ink/85">{section.intro}</p>
              )}
              <div className="mt-8 space-y-8">
                {section.topics.map((topic) => (
                  <div key={topic.title}>
                    <h3 className="font-display text-xl font-bold text-ink">{topic.title}</h3>
                    <p className="mt-3 max-w-3xl font-body text-base leading-relaxed text-muted">{topic.text}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section aria-labelledby="values-heading" className="scroll-mt-24 border-t-2 border-ink pt-10">
            <h2 id="values-heading" className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              What We Believe About Stories
            </h2>
            <ul className="mt-8 grid gap-5 md:grid-cols-3">
              {values.map((v) => (
                <li key={v.title} className="rounded-2xl border-2 border-ink bg-surface p-6">
                  <h3 className="font-display text-lg font-bold text-ink">{v.title}</h3>
                  <blockquote className="mt-3 border-l-4 border-tape pl-4 font-body text-lg italic leading-relaxed text-ink/85">
                    <p>&ldquo;{v.quote}&rdquo;</p>
                  </blockquote>
                </li>
              ))}
            </ul>
          </section>

          <div className="border-t-2 border-ink pt-10">
            <Faq items={ABOUT_FAQ} title="Frequently Asked Questions" id="faq" headingLevel={2} />
          </div>
        </div>
      </div>

      <CtaBand
        title="Found a mistake?"
        text="Open the guide and leave a comment describing what is wrong. Corrections are made after review."
        primary={{ href: "/ending-explained", label: "Open a guide" }}
        secondary={{ href: "/watch-order", label: "Browse watch orders" }}
      />
    </>
  );
}
