import type { Metadata } from "next";
import Link from "next/link";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { buildOgImageUrl } from "@/lib/og";
import { breadcrumbNode, graph, jsonLdString, WEBSITE_ID } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { WALLPAPER_CATEGORIES, WALLPAPERS } from "@/lib/wallpapers";
import WallpaperCard from "@/components/wallpapers/WallpaperCard";

const BASE_URL = getBaseUrl();
const PATH = "/wallpapers";
const TITLE = `Anime Girl Wallpapers — Free HD Backgrounds | ${SITE_NAME}`;
const DESCRIPTION =
  "Free anime girl wallpapers to save and set as your phone or desktop background — cyberpunk, vampire, fox spirit, gamer and lo-fi styles.";

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
        url: buildOgImageUrl({ title: "Anime Girl Wallpapers", subtitle: "Free HD backgrounds to save", badge: "WALLPAPERS" }),
        width: 1200,
        height: 630,
        alt: TITLE,
      },
    ],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const pageJsonLd = graph(
  {
    "@type": "CollectionPage",
    "@id": `${BASE_URL}${PATH}#webpage`,
    url: `${BASE_URL}${PATH}`,
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
    breadcrumb: { "@id": `${BASE_URL}${PATH}#breadcrumb` },
  },
  {
    "@id": `${BASE_URL}${PATH}#breadcrumb`,
    ...breadcrumbNode([
      { name: "Home", path: "/" },
      { name: "Wallpapers", path: PATH },
    ]),
  },
  {
    "@type": "ImageGallery",
    "@id": `${BASE_URL}${PATH}#gallery`,
    url: `${BASE_URL}${PATH}`,
    name: TITLE,
    image: WALLPAPERS.slice(0, 50).map((w) => `${BASE_URL}${w.src}`),
  }
);

export default function WallpapersPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(pageJsonLd) }} />

      <div className="bg-gradient-to-b from-heroFrom to-heroTo">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Wallpapers" }]} />
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Anime girl wallpapers
          </h1>
          <p className="mt-2 max-w-2xl font-body text-base leading-relaxed text-white/80 sm:text-lg">
            {WALLPAPERS.length} free anime girl wallpapers across {WALLPAPER_CATEGORIES.length} styles. Tap any
            image to view it full-size, then save it as your phone or desktop background.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {WALLPAPER_CATEGORIES.map((c) => (
              <a
                key={c.slug}
                href={`#${c.slug}`}
                className="rounded-full border-2 border-white/30 px-4 py-1.5 text-sm font-semibold text-white hover:border-tape hover:text-tape"
              >
                {c.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {WALLPAPER_CATEGORIES.map((category) => {
          const items = WALLPAPERS.filter((w) => w.category === category.slug);
          if (!items.length) return null;
          return (
            <section key={category.slug} id={category.slug} className="scroll-mt-24 border-b-2 border-fog py-10 last:border-b-0">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                    {category.heading}
                  </h2>
                  <p className="mt-1 max-w-2xl text-muted">{category.description}</p>
                </div>
                <span className="rounded-full border border-ink/20 bg-surface px-3 py-1 text-sm font-semibold text-muted">
                  {items.length} wallpapers
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {items.map((w, i) => (
                  <WallpaperCard key={w.slug} wallpaper={w} priority={category.slug === WALLPAPER_CATEGORIES[0].slug && i < 5} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="border-t-2 border-ink bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center sm:px-6">
          <p className="font-body text-sm text-muted">
            Looking for moving backgrounds instead? Browse{" "}
            <Link href="/stickers" className="font-semibold text-beam underline underline-offset-4 hover:text-beamDeep">
              anime girl GIFs &amp; stickers
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}
