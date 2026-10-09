import Link from "next/link";
import { ENDING_TOPICS, WATCH_ORDER_TOPICS } from "@/lib/topics";
import { getFeaturedFranchises } from "@/lib/api/franchises";
import { getLatestGuideLinks } from "@/lib/api/hub";
import { getBaseUrl, SITE_NAME } from "@/lib/site";

const footerQuote = "Every ending leaves a door open.";

// Opens Google's "preferred sources" picker for this site, so readers who
// like Marquee can ask Google to show it more often in Top Stories.
const PREFERRED_SOURCE_URL = `https://www.google.com/preferences/source?q=${new URL(getBaseUrl()).host}`;

const linkClass =
  "inline-flex min-h-11 items-center py-1 text-[15px] text-white/85 hover:text-tape hover:underline";
const headingClass = "font-display text-lg font-bold text-tape";
const inlineLink = "font-semibold text-white underline underline-offset-4 hover:text-tape";

export default async function Footer() {
  // Both lookups fail soft (empty list), so a database hiccup can never take
  // a page down; the static link columns below always render.
  const [latest, franchises] = await Promise.all([getLatestGuideLinks(6), getFeaturedFranchises(6)]);

  return (
    <footer className="mt-24 border-t-2 border-ink bg-ink text-white">
      <div className="slate-stripes" aria-hidden="true" />

      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
        <div className="col-span-2 lg:col-span-1">
          <p className="font-display text-3xl font-extrabold tracking-tight">{SITE_NAME}</p>
          <p className="mt-3 max-w-sm font-body text-base leading-relaxed text-white/75">
            Movie and anime endings explained in plain English, and the right order to watch every franchise.
          </p>
          <a
            href={PREFERRED_SOURCE_URL}
            target="_blank"
            rel="noopener"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-white/40 px-4 py-2 text-sm font-semibold text-white hover:border-tape hover:text-tape"
          >
            <span aria-hidden="true" className="text-tape">★</span>
            Add {SITE_NAME} as a preferred source on Google
          </a>
        </div>

        <nav aria-label="Ending explained">
          <p className={headingClass}>Ending explained</p>
          <ul className="mt-2">
            <li><Link href="/ending-explained" className={linkClass}>All ending guides</Link></li>
            {ENDING_TOPICS.map((t) => (
              <li key={t.slug}>
                <Link href={`/ending-explained/topic/${t.slug}`} className={linkClass}>{t.title}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Watch orders">
          <p className={headingClass}>Watch orders</p>
          <ul className="mt-2">
            <li><Link href="/watch-order" className={linkClass}>All watch orders</Link></li>
            {WATCH_ORDER_TOPICS.map((t) => (
              <li key={t.slug}>
                <Link href={`/watch-order/topic/${t.slug}`} className={linkClass}>{t.title}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Latest guides">
          <p className={headingClass}>Latest guides</p>
          <ul className="mt-2">
            {latest.map((g) => (
              <li key={`${g.kind}-${g.slug}`}>
                <Link href={`/ending-explained/${g.slug}`} className={linkClass}>{g.title} ending explained</Link>
              </li>
            ))}
            {latest.length === 0 && (
              <li><Link href="/ending-explained" className={linkClass}>Browse every guide</Link></li>
            )}
          </ul>
        </nav>

        <nav aria-label="Popular watch orders">
          <p className={headingClass}>Popular watch orders</p>
          <ul className="mt-2">
            {franchises.map((f) => (
              <li key={f.slug}>
                <Link href={`/watch-order/${f.slug}`} className={linkClass}>{f.title} watch order</Link>
              </li>
            ))}
            {franchises.length === 0 && (
              <li><Link href="/watch-order" className={linkClass}>Browse watch orders</Link></li>
            )}
            <li><Link href="/about" className={linkClass}>About {SITE_NAME}</Link></li>
            <li><Link href="/search" className={linkClass}>Search titles</Link></li>
            <li><Link href="/favorites" className={linkClass}>Saved titles</Link></li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/15">
        <p className="mx-auto max-w-6xl px-4 py-8 font-body text-sm leading-relaxed text-white/70 sm:px-6">
          {SITE_NAME} is an ending explained and watch order guide for movie and anime fans. Read{" "}
          <Link href="/ending-explained" className={inlineLink}>movie endings explained</Link>,{" "}
          <Link href="/ending-explained/topic/anime-finales" className={inlineLink}>anime finales explained</Link>,{" "}
          <Link href="/ending-explained/topic/mind-bending-endings" className={inlineLink}>mind-bending endings</Link> and{" "}
          <Link href="/ending-explained/topic/horror-endings" className={inlineLink}>horror endings</Link>, then follow
          the right <Link href="/watch-order" className={inlineLink}>watch order</Link> for{" "}
          <Link href="/watch-order/topic/superhero-universes" className={inlineLink}>superhero universes</Link>,{" "}
          <Link href="/watch-order/topic/anime-long-runners" className={inlineLink}>long-running anime</Link>,{" "}
          <Link href="/watch-order/topic/horror-franchises" className={inlineLink}>horror franchises</Link> and{" "}
          <Link href="/watch-order/topic/science-fiction-sagas" className={inlineLink}>science-fiction sagas</Link>.
          Spoilers stay hidden until you choose to reveal them. Learn{" "}
          <Link href="/about" className={inlineLink}>how every guide is made</Link>.
        </p>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>&copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
          <blockquote className="italic">
            <p>&ldquo;{footerQuote}&rdquo;</p>
          </blockquote>
        </div>
      </div>
    </footer>
  );
}
