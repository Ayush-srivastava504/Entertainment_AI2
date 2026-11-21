import Link from "next/link";
import type { Wallpaper } from "@/lib/wallpapers";

/*
Gallery tile on /wallpapers. Links to the wallpaper on its category page
(#slug): single-wallpaper pages were thin and now redirect there anyway.
The grid only loads the small -thumb.webp.
*/
export default function WallpaperCard({
  wallpaper,
  priority = false,
}: {
  wallpaper: Wallpaper;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/wallpapers/category/${wallpaper.category}#${wallpaper.slug}`}
      className="group block overflow-hidden rounded-xl border-2 border-ink bg-surface shadow-blockSm transition hover:-translate-y-0.5"
    >
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
      <p className="truncate px-2.5 py-2 text-xs font-semibold text-ink/80">{wallpaper.title}</p>
    </Link>
  );
}
