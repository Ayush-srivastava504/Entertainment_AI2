import type { Metadata } from "next";
import Link from "next/link";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { buildOgImageUrl } from "@/lib/og";
import { ABOUT_FAQ } from "@/lib/faq";
import { breadcrumbNode, graph, jsonLdString, ORG_ID, WEBSITE_ID } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
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
  {
    "@id": `${BASE_URL}${PATH}#breadcrumb`,
    ...breadcrumbNode([
      { name: "Home", path: "/" },
      { name: "About", path: PATH },
    ]),
  }
);

/* ---------- content ---------- */

const linkClass = "font-semibold text-beam underline underline-offset-4";

const jumpLinks = [
  { id: "what-is-marquee", label: "What we publish" },
  { id: "how-guides-are-made", label: "How guides are made" },
  { id: "find-titles", label: "Finding titles" },
  { id: "your-data", label: "Likes & comments" },
  { id: "next", label: "What's next" },
  { id: "faq", label: "FAQ" },
];

const facts = [
  { label: "Guide types", value: "2", note: "Endings and watch orders" },
  { label: "Covers", value: "Movies + anime", note: "One library" },
  { label: "Spoilers", value: "Hidden", note: "Until you tap reveal" },
  { label: "Account needed", value: "None", note: "Read, like, save, comment" },
];

const pillars = [
  {
    id: "ending-explained",
    tag: "After you watch",
    title: "Ending Explained",
    text: "The credits rolled and the questions started. Each guide walks through a recap, the ending itself, what it means, and the questions viewers ask most.",
    points: [
      "Spoiler-light recap first",
      "Ending stays behind a reveal button",
      "Facts kept apart from interpretation",
    ],
    href: "/ending-explained",
    cta: "Browse ending guides",
    tone: "bg-surface",
  },
  {
    id: "watch-order",
    tag: "Before you start",
    title: "Watch Order",
    text: "Long franchises hide their best route. Each guide lists every entry in a sensible order and says where release order and story order part ways.",
    points: [
      "Release, story and recommended orders explained",
      "Notes on what fits where",
      "Reviewed by a person before it goes live",
    ],
    href: "/watch-order",
    cta: "Browse watch orders",
    tone: "bg-tape",
  },
];

const process = [
  {
    title: "Start with facts",
    text: "Movie details and cast come from TMDB. Anime details come from public anime databases. Every guide begins with real catalog data.",
  },
  {
    title: "Draft with AI help",
    text: "AI helps draft ending explanations from those facts. It is a writing aid, never a replacement for checking.",
  },
  {
    title: "Check before publishing",
    text: "Each ending guide must pass a minimum-length check. Watch orders stay hidden until a person reviews and approves them.",
  },
  {
    title: "Correct in the open",
    text: "Found a mistake? Comment on the guide. Reports are reviewed and guides are corrected when needed.",
  },
];

const values = [
  { title: "Clarity", quote: "If a guide needs decoding, the guide has failed." },
  { title: "Respect for the first watch", quote: "Nobody gets to watch a story for the first time twice." },
  { title: "Honesty about uncertainty", quote: "An open ending should stay open on the page too." },
];

const findCards = [
  {
    title: "Search by title",
    text: (
      <>
        Look up a movie or anime on the{" "}
        <Link className={linkClass} href="/search">
          search page
        </Link>{" "}
        and jump straight to the guides that exist.
      </>
    ),
  },
  {
    title: "Missing a title?",
    text: "If a title has no guide yet, it has not been published. Send it through the Request an Ending form on the home page.",
  },
  {
    title: "Follow the connections",
    text: "Open a franchise guide to see how entries connect, then decide what belongs on your next watch list.",
  },
];

const yourData = [
  { title: "No account needed", text: "Like a title or save it for later without signing up. Likes and saved titles live in your own browser, so they do not follow you to another device." },
  { title: "Comments, moderated", text: "Comments are open without an account. They may be reviewed and removed through moderation, and factual corrections are checked against the guide." },
];

const nextUp = [
  "More ending explained and watch order guides across movies, anime and franchises",
  "Easier ways to find the titles and guides that match what you want to watch",
  "Steady improvements to readability, navigation and every screen size",
];

/* ---------- small pieces ---------- */

function SectionHeading({ id, kicker, title, intro }: { id: string; kicker: string; title: string; intro?: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-beam">{kicker}</p>
      <h2 id={id} className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {title}
      </h2>
      {intro && <p className="mt-4 font-body text-lg leading-relaxed text-muted">{intro}</p>}
    </div>
  );
}

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="mt-1 shrink-0">
      <circle cx="9" cy="9" r="8" fill="#FFD23F" stroke="#0D1030" strokeWidth="1.5" />
      <path d="M5.5 9.5l2.3 2.3 4.7-5" stroke="#0D1030" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdString(pageJsonLd) }}
      />

      {/* Hero */}
      <section className="overflow-hidden border-b-2 border-ink bg-beam text-white" aria-labelledby="about-heading">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "About" }]} />
            <p className="mt-5 inline-block rounded-full bg-tape px-3 py-1 text-sm font-bold text-ink">About {SITE_NAME}</p>
            <h1
              id="about-heading"
              className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl"
            >
              Endings, explained.
              <br />
              <span className="text-tape">Franchises, in order.</span>
            </h1>
            <p className="mt-5 max-w-xl font-body text-lg leading-relaxed text-white/90 sm:text-xl">
              {SITE_NAME} exists for the moment the credits roll and the questions start, and for the moment before,
              when a franchise has more entries than you can count.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/ending-explained"
                className="inline-flex min-h-[48px] items-center rounded-full border-2 border-ink bg-tape px-6 py-3 font-bold text-ink shadow-blockSm transition hover:-translate-y-0.5"
              >
                Read ending guides
              </Link>
              <Link
                href="/watch-order"
                className="inline-flex min-h-[48px] items-center rounded-full border-2 border-white/70 px-6 py-3 font-bold text-white transition hover:bg-white hover:text-ink"
              >
                Find a watch order
              </Link>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md rounded-2xl border-2 border-ink bg-surface text-ink shadow-block sm:rotate-1">
            <div className="slate-stripes rounded-t-[14px]" aria-hidden="true" />
            <p className="border-b-2 border-ink px-5 py-3 font-display text-lg font-bold">{SITE_NAME} at a glance</p>
            <dl className="divide-y divide-fog">
              {facts.map((f) => (
                <div key={f.label} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div>
                    <dt className="text-sm font-medium text-muted">{f.label}</dt>
                    <dd className="text-xs text-muted/80">{f.note}</dd>
                  </div>
                  <p className="text-right font-display text-xl font-extrabold">{f.value}</p>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Jump links */}
      <nav aria-label="On this page" className="border-b-2 border-ink bg-surface">
        <ul className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          {jumpLinks.map((l) => (
            <li key={l.id} className="shrink-0">
              <a
                href={`#${l.id}`}
                className="inline-flex min-h-[44px] items-center rounded-full border-2 border-ink px-4 py-2 text-sm font-semibold hover:bg-tape"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* What we publish */}
      <section id="what-is-marquee" aria-labelledby="publish-heading" className="scroll-mt-24 mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <SectionHeading
          id="publish-heading"
          kicker="What we publish"
          title="Two kinds of guide, one clear promise"
          intro="Every page uses plain language, short sections and a predictable order, so you never need a second tab to decode the guide itself."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {pillars.map((p) => (
            <article
              key={p.id}
              id={p.id}
              className={`scroll-mt-24 flex flex-col rounded-2xl border-2 border-ink p-6 shadow-block sm:p-8 ${p.tone}`}
            >
              <p className="w-fit rounded-full border-2 border-ink bg-paper px-3 py-1 text-xs font-bold uppercase tracking-wide">
                {p.tag}
              </p>
              <h3 className="mt-4 font-display text-3xl font-extrabold tracking-tight">{p.title}</h3>
              <p className="mt-3 font-body text-base leading-relaxed text-ink/85">{p.text}</p>
              <ul className="mt-5 space-y-2.5">
                {p.points.map((pt) => (
                  <li key={pt} className="flex gap-3 font-body text-base text-ink">
                    <Check />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={p.href}
                className="mt-7 inline-flex min-h-[48px] w-fit items-center rounded-full border-2 border-ink bg-ink px-6 py-3 font-bold text-white transition hover:-translate-y-0.5"
              >
                {p.cta} <span aria-hidden="true" className="ml-2">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Quote band */}
      <section className="border-y-2 border-ink bg-ink text-white" aria-label="A thought on stories">
        <figure className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 sm:py-16">
          <blockquote>
            <p className="font-display text-2xl font-extrabold leading-snug tracking-tight sm:text-4xl">
              &ldquo;A good ending answers one question and quietly asks another.&rdquo;
            </p>
          </blockquote>
        </figure>
      </section>

      {/* How guides are made */}
      <section id="how-guides-are-made" aria-labelledby="made-heading" className="scroll-mt-24 mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <SectionHeading
          id="made-heading"
          kicker="Our process"
          title="How every guide is made"
          intro="A guide is only useful if you can trust it, so here is exactly what happens between a catalog entry and a published page."
        />
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {process.map((step, i) => (
            <li key={step.title} className="relative rounded-2xl border-2 border-ink bg-surface p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink bg-tape font-display text-xl font-extrabold">
                {i + 1}
              </span>
              <h3 className="mt-4 font-display text-xl font-bold leading-tight">{step.title}</h3>
              <p className="mt-2 font-body text-base leading-relaxed text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Values */}
      <section className="border-y-2 border-ink bg-surface" aria-labelledby="values-heading">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <SectionHeading id="values-heading" kicker="What we believe" title="Three ideas behind every guide" />
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {values.map((v) => (
              <li key={v.title} className="rounded-2xl border-2 border-ink bg-paper p-6">
                <h3 className="font-display text-lg font-bold">{v.title}</h3>
                <blockquote className="mt-3 border-l-4 border-tape pl-4 font-body text-lg italic leading-relaxed text-ink/85">
                  <p>&ldquo;{v.quote}&rdquo;</p>
                </blockquote>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Finding titles */}
      <section id="find-titles" aria-labelledby="find-heading" className="scroll-mt-24 mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <SectionHeading id="find-heading" kicker="Getting around" title="Finding movies, anime and franchises" />
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {findCards.map((c) => (
            <li key={c.title} className="rounded-2xl border-2 border-ink bg-surface p-6">
              <h3 className="font-display text-xl font-bold">{c.title}</h3>
              <p className="mt-2 font-body text-base leading-relaxed text-muted">{c.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Likes, saves, comments + what's next */}
      <section className="border-y-2 border-ink bg-tape" aria-label="Community and roadmap">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2">
          <div id="your-data" className="scroll-mt-24 rounded-2xl border-2 border-ink bg-surface p-6 shadow-block sm:p-8">
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Likes, saved titles and comments</h2>
            <div className="mt-6 space-y-5">
              {yourData.map((d) => (
                <div key={d.title}>
                  <h3 className="font-display text-lg font-bold">{d.title}</h3>
                  <p className="mt-1 font-body text-base leading-relaxed text-muted">{d.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div id="next" className="scroll-mt-24 rounded-2xl border-2 border-ink bg-ink p-6 text-white shadow-block sm:p-8">
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">What {SITE_NAME} is building next</h2>
            <ul className="mt-6 space-y-4">
              {nextUp.map((n) => (
                <li key={n} className="flex gap-3 font-body text-base leading-relaxed text-white/90">
                  <Check />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20" aria-label="Frequently asked questions">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.7fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-beam">Good to know</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Questions about {SITE_NAME}</h2>
            <p className="mt-4 max-w-sm font-body text-lg text-muted">
              Who we are, how guides are written, and what to do when something is wrong.
            </p>
          </div>
          <Faq items={ABOUT_FAQ} title="Frequently Asked Questions" id="faq" headingLevel={3} />
        </div>
      </section>

      <CtaBand
        title="Found a mistake?"
        text="Open the guide and leave a comment describing what is wrong. Corrections are made after review."
        primary={{ href: "/ending-explained", label: "Open a guide" }}
        secondary={{ href: "/watch-order", label: "Browse watch orders" }}
      />
    </>
  );
}
