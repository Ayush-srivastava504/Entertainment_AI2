import { notFound, permanentRedirect } from "next/navigation";
import { getGifById } from "@/lib/api/gifs";
import { collectionForSticker } from "@/lib/sticker-collections";

/*
Single-GIF pages no longer exist as their own URLs. Each was ~80 words
around one image: too thin to index, so they sat as 160 noindexed URLs that
Google kept crawling instead of the collection pages. Every GIF is shown,
downloadable and copyable (WhatsApp) on its collection page, and its image
is listed in that page's image sitemap entry, so old links and shares
redirect there and land on the GIF itself (#id).
*/
export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

export default async function GifRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getGifById(id);
  if (!item) notFound();
  const collection = collectionForSticker(item);
  permanentRedirect(`${collection ? `/stickers/${collection.slug}` : "/stickers"}#${encodeURIComponent(item.id)}`);
}
