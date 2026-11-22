import type { GifItem } from "@/lib/api/gifs";
import CopyStickerButton from "@/components/stickers/CopyStickerButton";
import PinButton from "@/components/PinButton";
import { collectionForSticker } from "@/lib/sticker-collections";

/**
 * Masonry card used on /stickers/[collection]. The id is the anchor old
 * /gif/<id> URLs redirect to; the image opens the full file (which also makes
 * this page its landing page in Google Images); download and WhatsApp copy
 * are right on the card, so no separate single-GIF page is needed.
 */
export default function StickerCard({ item, label, eager }: { item: GifItem; label?: string; eager?: boolean }) {
  const name = label || item.title;
  const collection = collectionForSticker(item);
  return (
    <div id={item.id} className="mb-3 scroll-mt-24 break-inside-avoid overflow-hidden rounded-xl border-2 border-ink bg-surface shadow-block target:ring-4 target:ring-beam">
      <a href={item.fullUrl} target="_blank" rel="noopener" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.previewUrl}
          alt={item.alt ?? `${item.title} sticker`}
          width={item.width}
          height={item.height}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="h-auto w-full"
        />
      </a>
      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
        <span className="truncate text-xs font-semibold text-ink/80">{name}</span>
        <PinButton
          path={`${collection ? `/stickers/${collection.slug}` : "/stickers"}#${encodeURIComponent(item.id)}`}
          image={item.fullUrl}
          description={`${item.alt ?? item.title} - free anime girl sticker`}
        />
        <a
          href={item.fullUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Download ${item.title}`}
          className="shrink-0 rounded-full bg-beam px-2.5 py-1 text-xs font-bold text-white hover:bg-beamDeep"
        >
          ↓
        </a>
      </div>
      <div className="px-2 pb-2">
        <CopyStickerButton id={item.id} url={item.fullUrl} title={item.title} compact />
      </div>
    </div>
  );
}
