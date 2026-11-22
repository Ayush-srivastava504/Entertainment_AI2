import type { Wallpaper } from "@/lib/wallpapers";
import PinButton from "@/components/PinButton";

/*
Category-page tile: thumbnail (opens the full-size image) plus a one-tap
download button. The id is the anchor old single-wallpaper URLs redirect to.
Linking the thumbnail to the full file also tells Google Images that this
page is the landing page for that image. The grid only loads the small
-thumb.webp; the full file is fetched only on tap.
*/
export default function WallpaperDownloadCard({
  wallpaper,
  priority = false,
}: {
  wallpaper: Wallpaper;
  priority?: boolean;
}) {
  return (
    <div id={wallpaper.slug} className="scroll-mt-24 overflow-hidden rounded-xl border-2 border-ink bg-surface shadow-blockSm target:ring-4 target:ring-beam">
      <a href={wallpaper.src} target="_blank" rel="noopener" className="group block overflow-hidden">
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
      </a>
      <div className="flex items-center justify-between gap-2 p-2">
        <p className="truncate text-xs font-semibold text-ink/80">{wallpaper.title.replace(/ wallpaper/i, "")}</p>
        <PinButton
          path={`/wallpapers/category/${wallpaper.category}#${wallpaper.slug}`}
          image={wallpaper.src}
          description={`${wallpaper.alt} Free anime girl phone wallpaper.`}
        />
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
