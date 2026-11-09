import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { breadcrumbNode, graph, jsonLdString, WEBSITE_ID } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { WALLPAPER_CATEGORIES, getWallpapersByCategory } from "@/lib/wallpapers";
import WallpaperDownloadCard from "@/components/wallpapers/WallpaperDownloadCard";

const BASE_URL = getBaseUrl();

type Params = Promise<{ category: string }>;

export function generateStaticParams() {
  return WALLPAPER_CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category: slug } = await params;
  const category = WALLPAPER_CATEGORIES.find((c) => c.slug === slug);
  if (!category) return {};
  const items = getWallpapersByCategory(slug);
  const path = `/wallpapers/category/${slug}`;
  const title = `${category.heading} — Free Download | ${SITE_NAME}`;
  const description = `${category.description} Download all ${items.length} free ${category.label.toLowerCase()} wallpapers.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${BASE_URL}${path}` },
    openGraph: {
      type: "website",
      url: `${BASE_URL}${path}`,
      siteName: SITE_NAME,
      title,
      description,
      images: items[0]
        ? [{ url: `${BASE_URL}${items[0].src}`, width: items[0].width, height: items[0].height, alt: items[0].alt }]
        : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function WallpaperCategoryPage({ params }: { params: Params }) {
  const { category: slug } = await params;
  const category = WALLPAPER_CATEGORIES.find((c) => c.slug === slug);
  if (!category) notFound();
  const items = getWallpapersByCategory(slug);
  if (!items.length) notFound();

  const path = `/wallpapers/category/${slug}`;
  const pageJsonLd = graph(
    {
      "@type": "CollectionPage",
      "@id": `${BASE_URL}${path}#webpage`,
      url: `${BASE_URL}${path}`,
      name: category.heading,
      description: category.description,
      inLanguage: "en",
      isPartOf: { "@id": WEBSITE_ID },
      breadcrumb: { "@id": `${BASE_URL}${path}#breadcrumb` },
    },
    {
      "@id": `${BASE_URL}${path}#breadcrumb`,
      ...breadcrumbNode([
        { name: "Home", path: "/" },
        { name: "Wallpapers", path: "/wallpapers" },
        { name: category.label, path },
      ]),
    },
    {
      "@type": "ImageGallery",
      "@id": `${BASE_URL}${path}#gallery`,
      url: `${BASE_URL}${path}`,
      name: category.heading,
      image: items.map((w) => `${BASE_URL}${w.src}`),
    }
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(pageJsonLd) }} />

      <div className="bg-gradient-to-b from-heroFrom to-heroTo">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Breadcrumbs
            items={[{ name: "Home", href: "/" }, { name: "Wallpapers", href: "/wallpapers" }, { name: category.label }]}
          />
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {category.heading}
          </h1>
          <p className="mt-2 max-w-2xl font-body text-base leading-relaxed text-white/80 sm:text-lg">
            {category.description} {items.length} free wallpapers — tap Download under any image to save it.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {WALLPAPER_CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/wallpapers/category/${c.slug}`}
                aria-current={c.slug === slug ? "page" : undefined}
                className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold ${
                  c.slug === slug
                    ? "border-tape bg-tape text-ink"
                    : "border-white/30 text-white hover:border-tape hover:text-tape"
                }`}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {items.map((w, i) => (
            <WallpaperDownloadCard key={w.slug} wallpaper={w} priority={i < 5} />
          ))}
        </div>
        <p className="mt-6 text-xs text-muted">
          {items[0].width}×{items[0].height}px WebP — sized for phone screens, not 4K desktop.
        </p>
        <div className="mt-6">
          <Link
            href="/wallpapers"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-beam underline underline-offset-4 hover:text-beamDeep"
          >
            ← All wallpaper styles
          </Link>
        </div>
      </div>
    </>
  );
}
