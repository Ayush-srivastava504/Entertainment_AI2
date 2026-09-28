import Link from "next/link";
import { getBaseUrl } from "@/lib/site";
import { PageHero } from "@/components/ui/PageHero";
import { Faq } from "@/components/ui/Faq";
import { CtaBand } from "@/components/ui/CtaBand";
import { ABOUT_FAQ } from "@/lib/faq";

const BASE_URL = getBaseUrl();

export const metadata = {
  title: "About | Marquee",
  description: "What Marquee is, how its guides are made, and how to report a mistake.",
  alternates: { canonical: `${BASE_URL}/about` },
};

const principles = [
  {
    title: "Ending explained",
    text: "A breakdown of how a movie or anime actually ends: recap, the ending, its meaning, and an FAQ.",
    href: "/ending-explained",
    cta: "Read ending guides",
  },
  {
    title: "Watch order",
    text: "The right order to watch a franchise, with notes on why, and where release and story order differ.",
    href: "/watch-order",
    cta: "Browse watch orders",
  },
  {
    title: "Search",
    text: "Look up any title or franchise. If a guide exists, you will find it here.",
    href: "/search",
    cta: "Search guides",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        kicker="About"
        title="Endings, explained. Franchises, in order."
        subtitle="Marquee publishes two kinds of guide so you can finish a story with confidence and start the next one in the right place."
      />

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {principles.map((p) => (
            <Link
              key={p.title}
              href={p.href}
              className="group flex flex-col rounded-2xl border-2 border-ink bg-surface p-6 transition hover:-translate-y-1 hover:shadow-block"
            >
              <h2 className="font-display text-2xl font-extrabold group-hover:text-beam">{p.title}</h2>
              <p className="mt-3 font-body text-base leading-relaxed text-muted">{p.text}</p>
              <span className="mt-auto pt-5 font-bold text-beam underline underline-offset-4">{p.cta}</span>
            </Link>
          ))}
        </div>

        <section className="mt-20 max-w-3xl">
          <h2 className="font-display text-3xl font-bold tracking-tight">How the guides are made</h2>
          <div className="guide-prose mt-5 space-y-5">
            <p>
              Every ending explained guide starts from factual plot, cast and catalog data, then is written up in
              original language with AI. A guide is only published if it passes a minimum-length check.
            </p>
            <p>
              Watch order guides are drafted from release-date data and stay hidden until a person has reviewed and
              approved them, since a wrong watch order is worse than none.
            </p>
            <p>
              Likes, saved titles and comments have no account system. Likes and saved titles live in your browser;
              comments are moderated.
            </p>
          </div>
        </section>

        <div className="mt-20">
          <Faq items={ABOUT_FAQ} title="About Marquee, answered" />
        </div>
      </div>

      <CtaBand
        title="Found a mistake?"
        text="Open the guide and leave a comment describing what is wrong. Corrections are made after review."
        primary={{ href: "/ending-explained", label: "Open a guide" }}
      />
    </>
  );
}
