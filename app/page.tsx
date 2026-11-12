import type { Metadata } from "next";
import Link from "next/link";
import { searchGifs } from "@/lib/api/gifs";
import { getTrendingCharacters } from "@/lib/characters-db";
import { WALLPAPERS, WALLPAPER_CATEGORIES } from "@/lib/wallpapers";
import { SearchBar } from "@/components/media/SearchBar";
import { Faq } from "@/components/ui/Faq";
import { CtaBand } from "@/components/ui/CtaBand";
import { ANIME_GIRL_FAQ, HOME_FAQ } from "@/lib/faq";
import { AnimeGirlGuide } from "@/components/home/AnimeGirlGuide";
import { getBaseUrl, getHomeUrl, SITE_NAME } from "@/lib/site";
import { getGuidesPage } from "@/lib/api/guides";
import { getFeaturedFranchises } from "@/lib/api/franchises";
import { posterSrc } from "@/lib/image";
import { buildOgImageUrl } from "@/lib/og";
import { graph, jsonLdString, ORG_ID, WEBSITE_ID } from "@/lib/jsonld";
import HeroGifRotator from "@/components/HeroGifRotator";

export const revalidate = 3600;

const BASE_URL = getBaseUrl();
// Google reports the homepage as "https://animegirl4u.com/" (with the slash).
const HOME_URL = getHomeUrl();

// "anime girl" leads the title (the head term); pfp / cute / sad cover the
// biggest modifiers people search with it. Keep the title under ~60 chars.
const TITLE = `Anime Girl PFPs, Cute & Sad GIFs, Wallpapers | ${SITE_NAME}`;
const DESCRIPTION =
  "Anime girl GIFs, stickers and HD wallpapers, cute or sad, plus anime pfp picks. Download in one tap with no sign-up, and meet the anime characters fans love.";
const OG_IMAGE = buildOgImageUrl({ title: "Anime Girl PFPs, GIFs & Wallpapers", subtitle: "Cute, sad and iconic anime girls. Free to save.", badge: "ANIMEGIRL4U" });

const DEMO_VIDEO = "/home/download-demo.mp4";
const DEMO_POSTER = "/home/download-demo-poster.jpg";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  // No alternates.canonical here on purpose. Next.js strips the trailing
  // slash from a root URL ("https://animegirl4u.com"), and Search Console
  // then reported "https://animegirl4u.com/" as "Alternate page with proper
  // canonical tag". The exact URL is rendered as a <link> in the page
  // instead (React hoists it into <head>).
  openGraph: {
    type: "website",
    url: HOME_URL,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Anime girl PFPs, cute and sad GIFs and wallpapers on Animegirl4u" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  keywords: [
    "anime girl",
    "cute anime girl",
    "anime girl pfp",
    "anime pfp",
    "sad anime girl",
    "sad anime gif",
    "anime girl drawing",
    "anime characters",
    "anime girl wallpaper",
  ],
};

// Quick jumps from the hero: moods for GIFs, styles for wallpapers.
const heroChips = [
  { label: "Blushing GIFs", href: "/stickers?q=blush" },
  { label: "Wink GIFs", href: "/stickers?q=wink" },
  { label: "Fantasy wallpapers", href: "/wallpapers/category/fantasy" },
  { label: "Gothic wallpapers", href: "/wallpapers/category/gothic" },
  { label: "Sketch wallpapers", href: "/wallpapers/category/sketch" },
  { label: "Anime characters", href: "/anime-characters" },
];

const demoSteps = [
  { title: "Pick one", text: "Browse wallpapers by style or GIFs by mood." },
  { title: "Tap Download", text: "The file saves straight from this site. No redirects, no app." },
  { title: "Use it anywhere", text: "Phone background, Discord pfp or the perfect chat reaction." },
];

// The newest, most striking wallpaper styles first.
const FEATURED_STYLES = ["fantasy", "gothic", "cyberpunk", "sketch", "vampire", "crazy", "kitsune", "lofi"];


const sectionKicker = "text-sm font-bold uppercase text-beam";
const sectionTitle = "font-display text-2xl font-extrabold tracking-tight sm:text-3xl";
const browseAll = "shrink-0 text-sm font-bold text-beam underline underline-offset-4";

export default async function HomePage() {
  const [heroGifs, characters, latestGuides, watchOrders] = await Promise.all([
    searchGifs("cute anime girl", 12),
    getTrendingCharacters(6),
    getGuidesPage("all", 1, 6),
    getFeaturedFranchises(6),
  ]);

  const featuredWallpapers = FEATURED_STYLES.map((c) => WALLPAPERS.find((w) => w.category === c)).filter(
    (w): w is (typeof WALLPAPERS)[number] => Boolean(w),
  );

  const pageJsonLd = graph(
    {
      "@type": "WebPage",
      "@id": `${BASE_URL}/#webpage`,
      url: HOME_URL,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORG_ID },
      primaryImageOfPage: { "@type": "ImageObject", url: `${BASE_URL}${OG_IMAGE}`, width: 1200, height: 630 },
    },
    {
      "@type": "VideoObject",
      "@id": `${BASE_URL}/#download-demo`,
      name: "How to download an anime girl wallpaper on Animegirl4u",
      description: "Pick an anime girl wallpaper, tap Download and it saves to your phone, free and without sign-up.",
      thumbnailUrl: `${BASE_URL}${DEMO_POSTER}`,
      contentUrl: `${BASE_URL}${DEMO_VIDEO}`,
      uploadDate: "2026-11-10",
      duration: "PT9S",
    },
    {
      "@type": "ItemList",
      name: "Featured anime girl wallpapers",
      numberOfItems: featuredWallpapers.length,
      itemListElement: featuredWallpapers.map((w, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE_URL}/wallpapers/${w.slug}`,
        name: w.title,
      })),
    },
  );

  return (
    <>
      <link rel="canonical" href={HOME_URL} />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLdString(pageJsonLd) }}
      />

      {/* Hero */}
      <section className="overflow-hidden border-b-2 border-ink bg-gradient-to-br from-heroFrom to-heroTo text-white" aria-labelledby="home-heading">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-12">
          <div className="min-w-0">
            <p className="inline-block rounded-full bg-tape px-3 py-1 text-sm font-bold text-ink">No sign-up · one-tap downloads</p>
            <h1
              id="home-heading"
              className="mt-4 break-words font-display text-[2rem] font-extrabold leading-[1.08] tracking-tight min-[400px]:text-4xl sm:text-6xl lg:text-7xl"
            >
              Anime girl GIFs, PFPs &amp; wallpapers
            </h1>
            <p className="mt-5 max-w-xl font-body text-lg leading-relaxed text-white/90 sm:text-xl">
              Blushing, winking and pouting reactions, plus phone backgrounds you can save in one tap. Find your next
              pfp, or the GIF that says it better than words.
            </p>
            <div className="mt-8 max-w-xl">
              <SearchBar path="/stickers" size="lg" placeholder="Search GIFs: blush, wink, sleepy…" />
            </div>
            <nav className="mt-5 max-w-xl" aria-label="Popular picks">
              <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                {heroChips.map((c) => (
                  <li key={c.href} className="shrink-0">
                    <Link
                      href={c.href}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-tape hover:bg-tape hover:text-ink"
                    >
                      <span aria-hidden="true" className="text-tape">★</span>
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <HeroGifRotator />
        </div>
      </section>

      {/* Download demo */}
      <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-16" aria-labelledby="demo-heading">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-12">
          <div className="mx-auto w-full max-w-[260px] rounded-[2rem] border-4 border-ink bg-ink p-1.5 shadow-block">
            <video
              className="block aspect-[39/76] w-full rounded-[1.6rem] bg-paper object-cover"
              src={DEMO_VIDEO}
              poster={DEMO_POSTER}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              width={390}
              height={760}
              aria-label="Screen recording: picking an anime girl wallpaper and tapping Download"
            />
          </div>
          <div className="min-w-0">
            <p className={sectionKicker}>See how it works</p>
            <h2 id="demo-heading" className={`mt-2 ${sectionTitle}`}>
              Download in two taps
            </h2>
            <ol className="mt-6 space-y-4">
              {demoSteps.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-tape font-display text-lg font-extrabold text-ink">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold">{s.title}</h3>
                    <p className="font-body text-base leading-relaxed text-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/wallpapers" className="inline-flex min-h-[44px] items-center rounded-full border-2 border-ink bg-tape px-5 py-2 font-bold text-ink hover:-translate-y-0.5">
                Try a wallpaper
              </Link>
              <Link href="/stickers" className="inline-flex min-h-[44px] items-center rounded-full border-2 border-ink px-5 py-2 font-bold hover:bg-tape hover:text-ink">
                Try a GIF
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* GIFs */}
      <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-16" aria-labelledby="gifs-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className={sectionKicker}>Reactions</p>
            <h2 id="gifs-heading" className={sectionTitle}>
              Cute anime girl GIFs &amp; reactions
            </h2>
          </div>
          <Link href="/stickers" className={browseAll}>
            All GIFs →
          </Link>
        </div>
        <ul className="-mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-6">
          {heroGifs.map((g) => (
            <li key={g.id} className="w-32 shrink-0 sm:w-auto">
              <Link
                href={`/gif/${g.id}`}
                className="block overflow-hidden rounded-xl border-2 border-ink bg-surface shadow-block transition hover:-translate-y-0.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.previewUrl} alt={`${g.title} anime girl GIF`} loading="lazy" className="aspect-square w-full object-cover" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Wallpapers */}
      <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-16" aria-labelledby="wallpapers-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className={sectionKicker}>For your lock screen</p>
            <h2 id="wallpapers-heading" className={sectionTitle}>
              Anime girl wallpapers
            </h2>
          </div>
          <Link href="/wallpapers" className={browseAll}>
            All wallpapers →
          </Link>
        </div>
        <ul className="-mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-8">
          {featuredWallpapers.map((w) => (
            <li key={w.slug} className="w-32 shrink-0 sm:w-auto">
              <Link
                href={`/wallpapers/${w.slug}`}
                className="block overflow-hidden rounded-xl border-2 border-ink bg-surface shadow-block transition hover:-translate-y-0.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={w.thumbSrc} alt={w.alt} width={260} height={368} loading="lazy" className="aspect-[260/368] w-full object-cover" />
              </Link>
            </li>
          ))}
        </ul>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Wallpaper styles">
          {WALLPAPER_CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/wallpapers/category/${c.slug}`}
                className="inline-flex min-h-11 items-center rounded-full border-2 border-ink bg-surface px-4 py-1.5 text-sm font-bold transition hover:bg-tape hover:text-ink"
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Characters */}
      {characters.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-16" aria-labelledby="characters-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className={sectionKicker}>Trending this season</p>
              <h2 id="characters-heading" className={sectionTitle}>
                Anime characters fans love
              </h2>
            </div>
            <Link href="/anime-characters" className={browseAll}>
              All characters →
            </Link>
          </div>
          <ul className="-mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-6">
            {characters.map((c) => (
              <li key={c.id} className="w-32 shrink-0 sm:w-auto">
                <Link
                  href={`/anime-characters/${c.slug}`}
                  className="block overflow-hidden rounded-xl border-2 border-ink bg-surface shadow-block transition hover:-translate-y-0.5"
                >
                  {c.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt={c.name} width={230} height={325} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                  )}
                  <span className="block truncate px-2.5 pt-2 text-sm font-bold">{c.name}</span>
                  <span className="block truncate px-2.5 pb-2 text-xs text-muted">{c.anime[0]?.title ?? "Anime character"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Secondary: ending explained + watch order guides. Real links to the
          newest guides so they get a crawl path from the strongest page. */}
      {(latestGuides.length > 0 || watchOrders.length > 0) && (
        <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-16" aria-labelledby="guides-heading">
          <p className={sectionKicker}>Anime &amp; movie guides</p>
          <h2 id="guides-heading" className={sectionTitle}>
            Ending explained &amp; watch order guides
          </h2>
          <p className="mt-2 max-w-2xl font-body text-base leading-relaxed text-muted">
            Finished a series and want to know what the ending meant? Starting a long franchise? Every guide has a recap,
            the ending, what it means and the right order to watch.
          </p>

          {latestGuides.length > 0 && (
            <>
              <div className="mt-6 flex items-end justify-between gap-4">
                <h3 className="font-display text-xl font-bold">Latest ending explained</h3>
                <Link href="/ending-explained" className={browseAll}>
                  All endings →
                </Link>
              </div>
              <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {latestGuides.map((g) => (
                  <li key={`${g.kind}-${g.id}`}>
                    <Link
                      href={`/ending-explained/${g.slug}`}
                      className="group flex h-full gap-3 rounded-xl border-2 border-ink bg-surface p-2.5 transition hover:-translate-y-0.5 hover:shadow-block"
                    >
                      {g.posterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={posterSrc(g.posterUrl, 185)}
                          alt={`${g.title} poster`}
                          width={64}
                          height={96}
                          loading="lazy"
                          className="h-24 w-16 shrink-0 rounded-md border border-ink/20 object-cover"
                        />
                      ) : (
                        <span className="h-24 w-16 shrink-0 rounded-md bg-fog" aria-hidden="true" />
                      )}
                      <span className="min-w-0">
                        <span className="text-xs font-bold uppercase text-muted">
                          {g.kind === "anime" ? "Anime" : "Movie"}
                          {g.year ? ` · ${g.year}` : ""}
                        </span>
                        <span className="mt-0.5 block font-display text-base font-bold leading-snug group-hover:text-beam">
                          {g.title} ending explained
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {watchOrders.length > 0 && (
            <>
              <div className="mt-8 flex items-end justify-between gap-4">
                <h3 className="font-display text-xl font-bold">Watch order guides</h3>
                <Link href="/watch-order" className={browseAll}>
                  All watch orders →
                </Link>
              </div>
              <ul className="mt-4 flex flex-wrap gap-2">
                {watchOrders.map((f) => (
                  <li key={f.id}>
                    <Link
                      href={`/watch-order/${f.slug}`}
                      className="inline-flex min-h-11 items-center rounded-full border-2 border-ink bg-surface px-4 py-1.5 text-sm font-bold transition hover:bg-tape hover:text-ink"
                    >
                      {f.title} watch order
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="mt-8 font-body text-sm text-muted">
            Taking a break? <Link href="/games" className="font-semibold text-beam underline underline-offset-4">Play the mini-games</Link>,
            earn coins and collect chibi avatars.
          </p>
        </section>
      )}

      <AnimeGirlGuide />

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-20" aria-labelledby="questions-heading">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div>
            <h2 id="questions-heading" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Anime girl FAQ
            </h2>
            <p className="mt-4 max-w-sm font-body text-lg text-muted">
              The cutest anime characters, 4K wallpapers, how to draw a cute anime girl, and more.
            </p>
          </div>
          {/* One merged list = one FAQPage JSON-LD block for this page. */}
          <Faq items={[...ANIME_GIRL_FAQ, HOME_FAQ[5]]} title="Questions, answered" id="faq" headingLevel={3} />
        </div>
      </section>

      <CtaBand
        title="Your next wallpaper is one tap away."
        text="Nine styles to pick from, and every one saves straight to your phone with no sign-up."
        primary={{ href: "/wallpapers", label: "Browse wallpapers" }}
        secondary={{ href: "/stickers", label: "Get anime girl GIFs" }}
      />
    </>
  );
}
