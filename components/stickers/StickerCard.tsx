import Link from "next/link";
import type { GifItem } from "@/lib/api/gifs";

/** Masonry card used on /stickers and /stickers/[collection]. */
export default function StickerCard({ item, label, eager }: { item: GifItem; label?: string; eager?: boolean }) {
  const name = label || item.title;
  return (
    <div className="mb-3 break-inside-avoid overflow-hidden rounded-xl border-2 border-ink bg-surface shadow-block">
      <Link href={`/gif/${item.id}`} className="block">
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
      </Link>
      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
        <span className="truncate text-xs font-semibold text-ink/80">{name}</span>
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
    </div>
  );
}
