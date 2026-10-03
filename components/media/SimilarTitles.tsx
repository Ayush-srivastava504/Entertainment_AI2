import { MediaCard } from "@/components/media/MediaCard";
import type { MediaItem } from "@/lib/api/normalize";

export function SimilarTitles({ items, basePath, title = "You might also like", max = 4 }: { items: MediaItem[]; basePath: string; title?: string; max?: number }) {
  if (!items.length) return null;

  return (
    <section className="mt-16">
      <h2 className="font-display text-3xl font-bold tracking-tight text-ink">{title}</h2>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
        {items.slice(0, max).map((item) => (
          <MediaCard key={item.id} item={item} href={`${basePath}/${item.slug}`} />
        ))}
      </div>
    </section>
  );
}
