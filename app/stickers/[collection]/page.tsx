import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { breadcrumbNode, graph, jsonLdString, WEBSITE_ID } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import StickerCard from "@/components/stickers/StickerCard";
import {
  STICKER_COLLECTIONS,
  getStickerCollection,
  getStickersInCollection,
  shortStickerTitle,
} from "@/lib/sticker-collections";

export const revalidate = 3600;

type Params = Promise<{ collection: string }>;

export function generateStaticParams() {
  return STICKER_COLLECTIONS.map((c) => ({ collection: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { collection: slug } = await params;
  const c = getStickerCollection(slug);
  if (!c) return { title: "Stickers not found", robots: { index: false } };
  const items = await getStickersInCollection(slug);
  const path = `/stickers/${slug}`;
  const title = `${c.heading} — Free Download | ${SITE_NAME}`;
  const description = `${c.description} Download ${items.length ? `all ${items.length}` : "them"} free.`;
  const image = items[0]?.previewUrl;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${getBaseUrl()}${path}` },
    robots: items.length ? undefined : { index: false },
    openGraph: { type: "website", url: `${getBaseUrl()}${path}`, siteName: SITE_NAME, title, description, images: image ? [image] : undefined },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}

export default async function StickerCollectionPage({ params }: { params: Params }) {
  const { collection: slug } = await params;
  const c = getStickerCollection(slug);
  if (!c) notFound();
  const items = await getStickersInCollection(slug);

  const BASE_URL = getBaseUrl();
  const path = `/stickers/${slug}`;
  const pageJsonLd = graph(
    {
      "@type": "CollectionPage",
      "@id": `${BASE_URL}${path}#webpage`,
      url: `${BASE_URL}${path}`,
      name: c.heading,
      description: c.description,
      inLanguage: "en",
      isPartOf: { "@id": WEBSITE_ID },
      breadcrumb: { "@id": `${BASE_URL}${path}#breadcrumb` },
    },
    {
      "@id": `${BASE_URL}${path}#breadcrumb`,
      ...breadcrumbNode([
        { name: "Home", path: "/" },
        { name: "Stickers & GIFs", path: "/stickers" },
        { name: c.label, path },
      ]),
    },
    {
      "@type": "ImageGallery",
      "@id": `${BASE_URL}${path}#gallery`,
      url: `${BASE_URL}${path}`,
      name: c.heading,
      image: items.map((g) => g.fullUrl),
    }
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(pageJsonLd) }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Stickers & GIFs", href: "/stickers" }, { name: c.label }]} />

      <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">{c.heading}</h1>
      <p className="mt-2 max-w-2xl text-muted">
        {c.description} {items.length > 0 && `${items.length} free stickers — tap ↓ to download, or open one to share it.`}
      </p>

      <nav aria-label="Sticker collections" className="mt-5 flex flex-wrap gap-2">
        {STICKER_COLLECTIONS.map((x) => (
          <Link
            key={x.slug}
            href={`/stickers/${x.slug}`}
            aria-current={x.slug === slug ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm font-semibold hover:border-beam hover:text-beam ${
              x.slug === slug ? "border-beam bg-beam/10 text-beam" : "border-ink/20 bg-surface"
            }`}
          >
            {x.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 columns-2 gap-3 sm:columns-3 md:columns-4">
        {items.map((g, i) => (
          <StickerCard key={g.id} item={g} label={shortStickerTitle(g, c)} eager={i < 4} />
        ))}
      </div>

      {!items.length && (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-ink/30 p-8 text-center">
          <p className="font-semibold">No stickers in this collection yet.</p>
        </div>
      )}

      <p className="mt-10">
        <Link href="/stickers" className="text-sm font-semibold text-beam underline underline-offset-4 hover:text-beamDeep">
          ← All stickers &amp; GIFs
        </Link>
      </p>
    </div>
  );
}
