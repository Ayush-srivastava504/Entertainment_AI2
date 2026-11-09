import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { breadcrumbNode, graph, jsonLdString, WEBSITE_ID } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import ShareButton from "@/components/ShareButton";
import { WALLPAPERS, getWallpaper, getRelatedWallpapers } from "@/lib/wallpapers";
import WallpaperCard from "@/components/wallpapers/WallpaperCard";

const BASE_URL = getBaseUrl();

export function generateStaticParams() {
  return WALLPAPERS.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const wallpaper = getWallpaper(params.slug);
  if (!wallpaper) return {};

  const path = `/wallpapers/${wallpaper.slug}`;
  const title = `${wallpaper.title} — Free Download | ${SITE_NAME}`;
  const description = `Download this free ${wallpaper.categoryLabel.toLowerCase()} anime girl wallpaper and set it as your phone background. Part of the ${SITE_NAME} wallpaper collection.`;

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
      images: [{ url: `${BASE_URL}${wallpaper.src}`, width: wallpaper.width, height: wallpaper.height, alt: wallpaper.alt }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function WallpaperDetailPage({ params }: { params: { slug: string } }) {
  const wallpaper = getWallpaper(params.slug);
  if (!wallpaper) notFound();

  const related = getRelatedWallpapers(wallpaper, 6);
  const path = `/wallpapers/${wallpaper.slug}`;

  const pageJsonLd = graph(
    {
      "@type": "ImageObject",
      "@id": `${BASE_URL}${path}#image`,
      contentUrl: `${BASE_URL}${wallpaper.src}`,
      thumbnailUrl: `${BASE_URL}${wallpaper.thumbSrc}`,
      url: `${BASE_URL}${path}`,
      name: wallpaper.title,
      description: wallpaper.alt,
      width: wallpaper.width,
      height: wallpaper.height,
      isPartOf: { "@id": WEBSITE_ID },
      breadcrumb: { "@id": `${BASE_URL}${path}#breadcrumb` },
    },
    {
      "@id": `${BASE_URL}${path}#breadcrumb`,
      ...breadcrumbNode([
        { name: "Home", path: "/" },
        { name: "Wallpapers", path: "/wallpapers" },
        { name: wallpaper.categoryLabel, path: `/wallpapers#${wallpaper.category}` },
        { name: wallpaper.title, path },
      ]),
    }
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(pageJsonLd) }} />

      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Wallpapers", href: "/wallpapers" },
          { name: wallpaper.categoryLabel, href: `/wallpapers#${wallpaper.category}` },
          { name: wallpaper.title },
        ]}
      />

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,360px)_1fr]">
        <div>
          <div className="overflow-hidden rounded-2xl border-2 border-ink bg-surface shadow-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={wallpaper.src}
              alt={wallpaper.alt}
              width={wallpaper.width}
              height={wallpaper.height}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-auto w-full"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={wallpaper.src}
              download
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-beam px-5 py-2.5 font-bold text-white shadow-blockSm transition hover:-translate-y-0.5 hover:bg-beamDeep"
            >
              Download wallpaper
            </a>
            <ShareButton title={wallpaper.title} text={`${wallpaper.title} — free anime wallpaper`} contentType="wallpaper" />
          </div>

          <p className="mt-3 text-xs text-muted">
            {wallpaper.width}×{wallpaper.height}px, WebP. Sized for phone screens — not a 4K desktop wallpaper.
          </p>
        </div>

        <div>
          <span className="inline-flex rounded-full bg-tape px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">
            {wallpaper.categoryLabel}
          </span>
          <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            {wallpaper.title}
          </h1>
          <p className="mt-3 max-w-prose font-body text-base leading-relaxed text-muted">
            A free {wallpaper.categoryLabel.toLowerCase()}-style anime girl wallpaper from the {SITE_NAME} collection.
            Tap &ldquo;Download wallpaper&rdquo; to save the image, then set it as your lock screen or home screen
            background.
          </p>

          <div className="mt-6">
            <Link
              href="/wallpapers"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-beam underline underline-offset-4 hover:text-beamDeep"
            >
              ← Back to all wallpapers
            </Link>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14 border-t-2 border-fog pt-10">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
            More {wallpaper.categoryLabel.toLowerCase()} wallpapers
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {related.map((w) => (
              <WallpaperCard key={w.slug} wallpaper={w} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
