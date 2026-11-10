import type { Metadata } from "next";
import Link from "next/link";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { socialMeta } from "@/lib/og";
import { ABOUT_FAQ } from "@/lib/faq";
import { breadcrumbNode, graph, jsonLdString, ORG_ID, WEBSITE_ID } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Faq } from "@/components/ui/Faq";
import { CtaBand } from "@/components/ui/CtaBand";
import { getLatestGuideLinks, getTopRatedGuides } from "@/lib/api/hub";
import { getFeaturedFranchises } from "@/lib/api/franchises";
import { ENDING_TOPICS } from "@/lib/topics";

export const revalidate = 3600;

const BASE_URL = getBaseUrl();
const PATH = "/about";
const TITLE = `About ${SITE_NAME}: Free Anime Girl GIFs, Wallpapers & Guides`;
const DESCRIPTION =
  "Animegirl4u is an independent anime fan site with free original anime girl GIFs and wallpapers, character profiles, mini-games and anime guides.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${BASE_URL}${PATH}` },
  ...socialMeta({
    title: TITLE,
    description: DESCRIPTION,
    path: PATH,
    cardTitle: `About ${SITE_NAME}`,
    cardSubtitle: "Anime girl GIFs, wallpapers, characters and guides, free",
    badge: "ABOUT",
  }),
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
  { id: "what-is-animegirl4u", label: "What you'll find" },
  { id: "how-guides-are-made", label: "Where content comes from" },
  { id: "find-titles", label: "Finding titles" },
  { id: "your-data", label: "Likes & comments" },
  { id: "next", label: "What's next" },
  { id: "faq", label: "FAQ" },
];

const facts = [
  { label: "GIFs & wallpapers", value: "Original", note: "Download straight from this site" },
  { label: "Anime characters", value: "Profiles", note: "Most loved and trending" },
  { label: "Price", value: "Free", note: "Everything on the site" },
  { label: "Account needed", value: "None", note: "Download, play, read, comment" },
];

const pillars = [
  {
    id: "stickers",
    tag: "Send it",
    title: "Anime girl GIFs & stickers",
    text: "Cute, shy, excited and sad anime girl reactions for chats and Discord. Every GIF is original to Animegirl4u and downloads directly from this site, with no detour to another app.",
    points: ["Original GIFs, not reposts", "One-tap download", "Free for personal use"],
    href: "/stickers",
    cta: "Browse stickers & GIFs",
    tone: "bg-surface",
  },
  {
    id: "wallpapers",
    tag: "Save it",
    title: "Anime girl wallpapers",
    text: "Phone and tablet wallpapers grouped by mood: cyberpunk, fantasy, gothic, vampire, lo-fi, sketch and more. Each one lists its exact resolution before you download.",
    points: ["Original art made for Animegirl4u", "Honest sizes, never upscaled", "Free downloads"],
    href: "/wallpapers",
    cta: "Browse wallpapers",
    tone: "bg-tape",
  },
  {
    id: "characters",
    tag: "Meet them",
    title: "Anime characters",
    text: "Profiles of the most loved and currently trending anime characters, with the series they appear in, Japanese and English voice actors, and spoiler-free overviews.",
    points: ["Ranked by fan favourites", "Trending characters each season", "Voice actors and appearances"],
    href: "/anime-characters",
    cta: "Explore anime characters",
    tone: "bg-surface",
  },
  {
    id: "games",
    tag: "Play",
    title: "Anime mini-games",
    text: "Quick browser games, from Memory Match and Four in a Row to Slide 15, that earn coins for the spin wheel, where you collect chibi avatars to download.",
    points: ["No downloads or sign-up", "Works on phones", "Collect and save avatars"],
    href: "/games",
    cta: "Play the games",
    tone: "bg-tape",
  },
  {
    id: "ending-explained",
    tag: "After you watch",
    title: "Ending explained",
    text: "The credits rolled and the questions started. Each guide walks through a recap, the ending itself, what it means, and the questions viewers ask most.",
    points: ["Spoiler-light recap first", "Ending stays behind a reveal button", "Facts kept apart from interpretation"],
    href: "/ending-explained",
    cta: "Browse ending guides",
    tone: "bg-surface",
  },
  {
    id: "watch-order",
    tag: "Before you start",
    title: "Watch order",
    text: "Long franchises hide their best route. Each guide lists every entry in a sensible order and says where release order and story order part ways.",
    points: ["Release, story and recommended orders", "Notes on what fits where", "Reviewed by a person before it goes live"],
    href: "/watch-order",
    cta: "Browse watch orders",
    tone: "bg-tape",
  },
];

const process = [
  {
    title: "Original art",
    text: "GIFs, stickers and wallpapers are original images created for Animegirl4u and hosted here, so downloads come straight from this site.",
  },
  {
    title: "Trusted data",
    text: "Character profiles use AniList data, movie details come from TMDB, and anime details come from public anime databases.",
  },
  {
    title: "AI as a writing aid",
    text: "AI helps draft guide text and character overviews from those facts, with spoilers stripped out. It never replaces checking.",
  },
  {
    title: "Checked and corrected",
    text: "Guides must pass quality checks, watch orders wait for human approval, and reported mistakes are reviewed and fixed.",
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
  { title: "An independent fan site", text: "Animegirl4u is not affiliated with any anime studio, publisher or streaming service. Anime titles and characters belong to their respective owners; character profiles and guides are fan commentary." },
];

const nextUp = [
  "New original GIFs, stickers and wallpaper collections",
  "More anime character profiles as each season's shows trend",
  "New mini-games and more collectible avatars",
  "More ending explained and watch order guides, added gradually",
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

export default async function AboutPage() {
  const [latest, topMovies, topAnime, franchises] = await Promise.all([
    getLatestGuideLinks(5),
    getTopRatedGuides("movie", 3),
    getTopRatedGuides("anime", 3),
    getFeaturedFranchises(5),
  ]);
  const readingLinks = [
    { label: "Newest guides", list: latest.map((g) => ({ href: `/ending-explained/${g.slug}`, text: `${g.title} ending explained` })) },
    { label: "Reader favorites", list: [...topMovies, ...topAnime].map((g) => ({ href: `/ending-explained/${g.slug}`, text: `${g.title} ending explained` })) },
    { label: "Watch orders", list: franchises.map((f) => ({ href: `/watch-order/${f.slug}`, text: `${f.title} watch order` })) },
    { label: "Collections", list: ENDING_TOPICS.slice(0, 5).map((t) => ({ href: `/ending-explained/topic/${t.slug}`, text: t.title })) },
  ].filter((c) => c.list.length > 0);

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdString(pageJsonLd) }}
      />

      {/* Hero */}
      <section className="overflow-hidden border-b-2 border-ink bg-gradient-to-br from-heroFrom to-heroTo text-white" aria-labelledby="about-heading">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "About" }]} />
            <p className="mt-5 inline-block rounded-full bg-tape px-3 py-1 text-sm font-bold text-ink">About {SITE_NAME}</p>
            <h1
              id="about-heading"
              className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl"
            >
              Anime girls, characters
              <br />
              <span className="text-tape">and stories, all free.</span>
            </h1>
            <p className="mt-5 max-w-xl font-body text-lg leading-relaxed text-white/90 sm:text-xl">
              {SITE_NAME} is an independent fan site for people who love anime: original anime girl GIFs and wallpapers to
              download, profiles of the characters everyone talks about, quick games, and clear guides for when a series
              ends.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/stickers"
                className="inline-flex min-h-[48px] items-center rounded-full border-2 border-ink bg-tape px-6 py-3 font-bold text-ink shadow-blockSm transition hover:-translate-y-0.5"
              >
                Get anime girl GIFs
              </Link>
              <Link
                href="/wallpapers"
                className="inline-flex min-h-[48px] items-center rounded-full border-2 border-white/70 px-6 py-3 font-bold text-white transition hover:bg-white hover:text-ink"
              >
                Browse wallpapers
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
      <section id="what-is-animegirl4u" aria-labelledby="publish-heading" className="scroll-mt-24 mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <SectionHeading
          id="publish-heading"
          kicker="What you'll find"
          title="Everything on Animegirl4u, in one place"
          intro="Six sections, all free and without sign-ups. Pick what you came for."
        />
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p) => (
            <article
              key={p.id}
              id={p.id}
              className={`scroll-mt-24 flex flex-col rounded-2xl border-2 border-ink p-6 shadow-block sm:p-8 ${p.tone}`}
            >
              <p className="w-fit rounded-full border-2 border-ink bg-paper px-3 py-1 text-xs font-bold uppercase tracking-wide">
                {p.tag}
              </p>
              <h3 className="mt-4 font-display text-2xl font-extrabold tracking-tight">{p.title}</h3>
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
                className="mt-7 inline-flex min-h-[48px] w-fit items-center rounded-full border-2 border-ink bg-surface px-6 py-3 font-bold text-white transition hover:-translate-y-0.5"
              >
                {p.cta} <span aria-hidden="true" className="ml-2">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Quote band */}
      <section className="border-y-2 border-ink bg-surface text-white" aria-label="A thought on stories">
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
          kicker="Where content comes from"
          title="Original art, trusted data, checked guides"
          intro="You should know where what you download and read comes from. Here is exactly how it is made."
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
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Likes, comments and who we are</h2>
            <div className="mt-6 space-y-5">
              {yourData.map((d) => (
                <div key={d.title}>
                  <h3 className="font-display text-lg font-bold">{d.title}</h3>
                  <p className="mt-1 font-body text-base leading-relaxed text-muted">{d.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div id="next" className="scroll-mt-24 rounded-2xl border-2 border-ink bg-surface p-6 text-white shadow-block sm:p-8">
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

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="start-reading">
        <h2 id="start-reading" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Start reading
        </h2>
        <p className="mt-3 max-w-2xl font-body text-lg text-muted">
          The best way to see how {SITE_NAME} guides work is to open one.
        </p>
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {readingLinks.map((col) => (
            <div key={col.label}>
              <h3 className="font-display text-xl font-bold">{col.label}</h3>
              <ul className="mt-2">
                {col.list.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="inline-flex min-h-11 items-center py-1 font-semibold text-beam underline-offset-4 hover:underline">
                      {l.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
