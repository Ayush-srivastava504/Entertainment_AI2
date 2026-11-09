import Link from "next/link";
import type { Wallpaper } from "@/lib/wallpapers";

/*
Category-page tile: thumbnail (links to the detail page) plus a one-tap
download button that serves the full-size file directly. The grid only loads
the small -thumb.webp; the full file is fetched only if the user downloads it.
*/
export default function WallpaperDownloadCard({
  wallpaper,
  priority = false,
}: {
  wallpaper: Wallpaper;
  priority?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border-2 border-ink bg-surface shadow-blockSm">
      <Link href={`/wallpapers/${wallpaper.slug}`} className="group block overflow-hidden">
        <div className="aspect-[326/462] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={wallpaper.thumbSrc}
            alt={wallpaper.alt}
            width={wallpaper.width}
            height={wallpaper.height}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 p-2">
        <p className="truncate text-xs font-semibold text-ink/80">{wallpaper.title.replace(/ wallpaper/i, "")}</p>
        <a
          href={wallpaper.src}
          download={`${wallpaper.slug}.webp`}
          aria-label={`Download ${wallpaper.title}`}
          className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-beam px-3 text-xs font-bold text-white transition hover:bg-beamDeep"
        >
          ↓ Download
        </a>
      </div>
    </div>
  );
}
