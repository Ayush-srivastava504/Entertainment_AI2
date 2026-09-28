import Link from "next/link";
import type { MediaItem } from "@/lib/api/normalize";

export function MediaCard({ item, href }: { item: MediaItem; href: string }) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-ink bg-surface transition hover:-translate-y-1 hover:shadow-block"
    >
      <div className="relative aspect-[2/3] overflow-hidden border-b-2 border-ink bg-fog">
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt={`${item.title} poster`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted">No poster yet</div>
        )}
        <span className="absolute left-3 top-3 rounded-full border-2 border-ink bg-tape px-2.5 py-0.5 text-xs font-bold text-ink">
          {item.kind === "anime" ? "Anime" : "Movie"}
        </span>
        {item.score ? (
          <span className="absolute right-3 top-3 rounded-full border-2 border-ink bg-surface px-2.5 py-0.5 text-xs font-bold text-ink">
            ★ {item.score.toFixed(1)}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-xl font-bold leading-tight text-ink group-hover:text-beam">
          {item.title} ending explained
        </h3>
        {item.description && <p className="mt-2 line-clamp-3 font-body text-sm leading-relaxed text-muted">{item.description}</p>}
        <p className="mt-auto pt-3 text-xs font-semibold text-muted">
          {[item.year, ...item.genres.slice(0, 2)].filter(Boolean).join(", ")}
        </p>
      </div>
    </Link>
  );
}
