import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGifById } from "@/lib/api/gifs";
import { getOrCreateCaption } from "@/lib/api/gif-captions";
import { getBaseUrl, SITE_NAME } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const item = await getGifById(params.id);
  if (!item) return { title: "GIF not found" };
  return {
    title: `${item.title} | ${SITE_NAME}`,
    description: `Download the "${item.title}" anime GIF, free, on ${SITE_NAME}.`,
    alternates: { canonical: `${getBaseUrl()}/gif/${params.id}` },
    openGraph: { images: [item.previewUrl] },
  };
}

export default async function GifDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const item = await getGifById(params.id);
  if (!item) notFound();

  // Never blocks the page — resolves to null if Gemini/DB aren't configured
  // yet, and the caption section is simply skipped.
  const caption = await getOrCreateCaption(item);

  return (
    <article className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="overflow-hidden rounded-2xl border-2 border-ink bg-surface shadow-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.fullUrl} alt={item.title} className="w-full h-auto" />
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <h1 className="font-display text-xl font-extrabold">{item.title}</h1>
        <a
          href={item.fullUrl}
          download
          className="shrink-0 rounded-full bg-beam px-4 py-2 text-sm font-bold text-white hover:opacity-90"
        >
          Download
        </a>
      </div>

      {caption && (
        <p className="mt-4 border-t-2 border-ink/10 pt-4 text-sm leading-relaxed text-muted">{caption}</p>
      )}
    </article>
  );
}
