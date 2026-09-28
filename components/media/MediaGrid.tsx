import { MediaCard } from "@/components/media/MediaCard";
import type { MediaItem } from "@/lib/api/normalize";

export function MediaGrid({ items, basePath }: { items: MediaItem[]; basePath: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <MediaCard key={item.id} item={item} href={`${basePath}/${item.slug}`} />
      ))}
    </div>
  );
}
