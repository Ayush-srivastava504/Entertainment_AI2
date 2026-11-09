import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGifById, searchGifs } from "@/lib/api/gifs";
import { getOrCreateCaption } from "@/lib/api/gif-captions";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { breadcrumbNode, graph, jsonLdString, WEBSITE_ID } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import ShareButton from "@/components/ShareButton";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const item = await getGifById(id);
  if (!item) return { title: "GIF not found", robots: { index: false } };
  const title = `${item.title} | ${SITE_NAME}`;
  const description = `Download the "${item.title}" anime GIF, free, on ${SITE_NAME}.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${getBaseUrl()}/gif/${id}` },
    // Only your own originals are unique content; Tenor/Giphy pages are thin.
    robots: item.source === "original" ? undefined : { index: false, follow: true },
    openGraph: { type: "website", title, description, images: [item.previewUrl] },
    twitter: { card: "summary_large_image", title, description, images: [item.previewUrl] },
  };
}

export default async function GifDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const item = await getGifById(id);
  if (!item) notFound();

  // Neither of these may ever block or crash the page.
  const [caption, more] = await Promise.all([
    getOrCreateCaption(item),
    searchGifs(item.title.split(/\s+/).slice(0, 3).join(" ") || "anime girl", 9).catch(() => []),
  ]);
  const related = more.filter((g) => g.id !== item.id).slice(0, 8);

  const BASE_URL = getBaseUrl();
  const path = `/gif/${id}`;
  const pageJsonLd = graph(
    {
      "@type": "ImageObject",
      "@id": `${BASE_URL}${path}#image`,
      contentUrl: item.fullUrl,
      thumbnailUrl: item.previewUrl,
      url: `${BASE_URL}${path}`,
      name: item.title,
      description: caption || item.title,
      encodingFormat: /\.png$/i.test(item.fullUrl) ? "image/png" : /\.webp$/i.test(item.fullUrl) ? "image/webp" : /\.jpe?g$/i.test(item.fullUrl) ? "image/jpeg" : "image/gif",
      isPartOf: { "@id": WEBSITE_ID },
      breadcrumb: { "@id": `${BASE_URL}${path}#breadcrumb` },
    },
    {
      "@id": `${BASE_URL}${path}#breadcrumb`,
      ...breadcrumbNode([
        { name: "Home", path: "/" },
        { name: "Stickers & GIFs", path: "/stickers" },
        { name: item.title, path },
      ]),
    }
  );

  return (
    <article className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(pageJsonLd) }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Stickers & GIFs", href: "/stickers" }, { name: item.title }]} />

      <div className="mt-5 overflow-hidden rounded-2xl border-2 border-ink bg-surface shadow-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.fullUrl}
          alt={item.title}
          width={item.width}
          height={item.height}
          loading="eager"
          fetchPriority="high"
          className="h-auto w-full"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-extrabold">{item.title}</h1>
        <div className="flex items-center gap-2">
          <ShareButton title={item.title} text={`${item.title} — free anime GIF`} contentType="gif" />
          <a
            href={item.fullUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-beam px-5 text-sm font-bold text-white hover:bg-beamDeep"
          >
            Download
          </a>
        </div>
      </div>

      {caption && (
        <p className="mt-4 border-t-2 border-ink/10 pt-4 text-sm leading-relaxed text-muted">{caption}</p>
      )}

      {related.length > 0 && (
        <section className="mt-10 border-t-2 border-ink/10 pt-6">
          <h2 className="font-display text-lg font-extrabold">More like this</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {related.map((g) => (
              <Link
                key={g.id}
                href={`/gif/${g.id}`}
                className="block overflow-hidden rounded-xl border-2 border-ink bg-surface"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.previewUrl} alt={g.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mt-8">
        <Link href="/stickers" className="text-sm font-semibold text-beam underline underline-offset-4 hover:text-beamDeep">
          ← Back to all stickers &amp; GIFs
        </Link>
      </p>
    </article>
  );
}
