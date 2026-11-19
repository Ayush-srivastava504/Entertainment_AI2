import Link from "next/link";
import { getIndexableEndingTopics, getIndexableWatchOrderTopics } from "@/lib/api/topic-hubs";
import { STICKER_COLLECTIONS } from "@/lib/sticker-collections";
import { WALLPAPER_CATEGORIES } from "@/lib/wallpapers";
import { getFeaturedFranchises } from "@/lib/api/franchises";
import { getLatestGuideLinks } from "@/lib/api/hub";
import { getBaseUrl, SITE_NAME } from "@/lib/site";

const footerQuote = "Every ending leaves a door open.";

// Opens Google's "preferred sources" picker for this site, so readers who
// like Animegirl4u can ask Google to show it more often in Top Stories.
const PREFERRED_SOURCE_URL = `https://www.google.com/preferences/source?q=${new URL(getBaseUrl()).host}`;

const linkClass =
  "inline-flex min-h-11 items-center py-1 text-[15px] text-white/85 hover:text-tape hover:underline";
const headingClass = "font-display text-lg font-bold text-tape";
const inlineLink = "font-semibold text-white underline underline-offset-4 hover:text-tape";

export default async function Footer() {
  // Both lookups fail soft (empty list), so a database hiccup can never take
  // a page down; the static link columns below always render.
  // Topic links only for hubs with enough guides to be indexed, so the
  // footer never sends every page's link weight to an empty or noindex hub.
  const [latest, franchises, endingTopics, watchOrderTopics] = await Promise.all([
    getLatestGuideLinks(6),
    getFeaturedFranchises(6),
    getIndexableEndingTopics().catch(() => []),
    getIndexableWatchOrderTopics().catch(() => []),
  ]);

  return (
    <footer className="mt-24 border-t-2 border-ink bg-surface text-white">
      <div className="slate-stripes" aria-hidden="true" />

      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
        <div className="col-span-2 lg:col-span-1">
          <p className="font-display text-3xl font-extrabold tracking-tight">{SITE_NAME}</p>
          <p className="mt-3 max-w-sm font-body text-base leading-relaxed text-white/75">
            Free anime girl GIFs, stickers and wallpapers, plus anime endings explained in plain English.
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

        <nav aria-label="Anime girl GIFs and wallpapers">
          <p className={headingClass}>GIFs &amp; wallpapers</p>
          <ul className="mt-2">
            <li><Link href="/stickers" className={linkClass}>Anime girl GIFs &amp; stickers</Link></li>
            {STICKER_COLLECTIONS.slice(0, 4).map((c) => (
              <li key={c.slug}>
                <Link href={`/stickers/${c.slug}`} className={linkClass}>{c.label} stickers</Link>
              </li>
            ))}
            <li><Link href="/wallpapers" className={linkClass}>Anime girl wallpapers</Link></li>
            {WALLPAPER_CATEGORIES.slice(0, 4).map((c) => (
              <li key={c.slug}>
                <Link href={`/wallpapers/category/${c.slug}`} className={linkClass}>{c.label} wallpapers</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Ending explained">
          <p className={headingClass}>Ending explained</p>
          <ul className="mt-2">
            <li><Link href="/ending-explained" className={linkClass}>All ending guides</Link></li>
            {endingTopics.map((t) => (
              <li key={t.slug}>
                <Link href={`/ending-explained/topic/${t.slug}`} className={linkClass}>{t.title}</Link>
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

        <nav aria-label={franchises.length ? "Watch orders" : "Site"}>
          {franchises.length > 0 && (
            <>
              <p className={headingClass}>Watch orders</p>
              <ul className="mt-2">
                <li><Link href="/watch-order" className={linkClass}>All watch orders</Link></li>
                {franchises.map((f) => (
                  <li key={f.slug}>
                    <Link href={`/watch-order/${f.slug}`} className={linkClass}>{f.title} watch order</Link>
                  </li>
                ))}
                {watchOrderTopics.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/watch-order/topic/${t.slug}`} className={linkClass}>{t.title}</Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className={`${headingClass} ${franchises.length ? "mt-6" : ""}`}>{SITE_NAME}</p>
          <ul className="mt-2">
            <li><Link href="/about" className={linkClass}>About {SITE_NAME}</Link></li>
            <li><Link href="/privacy" className={linkClass}>Privacy policy</Link></li>
            <li><Link href="/delete-data" className={linkClass}>Delete my data</Link></li>
            <li><Link href="/search" className={linkClass}>Search titles</Link></li>
            <li><Link href="/favorites" className={linkClass}>Saved titles</Link></li>
          </ul>
        </nav>
      </div>

      <nav aria-label="Explore" className="border-t border-white/15">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 px-4 py-4 sm:px-6">
          <p className={headingClass}>Explore</p>
          <Link href="/anime-characters" className={linkClass}>Anime characters</Link>
          <Link href="/anime-characters/leads" className={linkClass}>Trending anime leads</Link>
          <Link href="/wallpapers" className={linkClass}>Wallpapers</Link>
          <Link href="/stickers" className={linkClass}>Stickers &amp; GIFs</Link>
          <Link href="/stickers/maker" className={linkClass}>Sticker maker</Link>
          <Link href="/games" className={linkClass}>Games</Link>
          <Link href="/games/spin" className={linkClass}>Spin for avatars</Link>
        </div>
      </nav>

      <div className="border-t border-white/15">
        <p className="mx-auto max-w-6xl px-4 py-8 font-body text-sm leading-relaxed text-white/70 sm:px-6">
          {SITE_NAME} is a free library of <Link href="/stickers" className={inlineLink}>anime girl GIFs and stickers</Link>{" "}
          and <Link href="/wallpapers" className={inlineLink}>anime girl wallpapers</Link>, with profiles of the{" "}
          <Link href="/anime-characters" className={inlineLink}>anime characters</Link> fans love. Finished a series? Read{" "}
          <Link href="/ending-explained" className={inlineLink}>anime endings explained</Link>
          {franchises.length > 0 && (
            <>
              {" "}or check the right <Link href="/watch-order" className={inlineLink}>watch order</Link>
            </>
          )}
          . Spoilers stay hidden until you choose to reveal them. Learn{" "}
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
