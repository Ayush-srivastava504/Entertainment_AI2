import Link from "next/link";

export interface BarChartItem {
  label: string;
  value: number;
  href?: string;
  highlight?: boolean;
}

/**
 * Horizontal bar chart drawn with plain HTML/CSS (no chart library, so it
 * server-renders and adds no client JS). Values are real data only; `max`
 * is the full-bar value (10 for ratings).
 */
export function BarChart({
  title,
  items,
  max = 10,
  unit = "",
  caption,
}: {
  title: string;
  items: BarChartItem[];
  max?: number;
  unit?: string;
  caption?: string;
}) {
  if (items.length === 0) return null;

  return (
    <figure className="rounded-2xl border-2 border-ink bg-surface p-5 sm:p-6">
      <figcaption className="font-display text-xl font-bold text-ink">{title}</figcaption>
      <ul className="mt-5 space-y-4">
        {items.map((item) => {
          const pct = Math.max(2, Math.min(100, (item.value / max) * 100));
          return (
            <li key={item.label}>
              <div className="flex items-baseline justify-between gap-3 text-[15px]">
                <span className={`truncate font-semibold ${item.highlight ? "text-beam" : "text-ink"}`}>
                  {item.href ? (
                    <Link href={item.href} className="hover:underline">
                      {item.label}
                    </Link>
                  ) : (
                    item.label
                  )}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-ink">
                  {item.value.toFixed(1)}
                  {unit}
                </span>
              </div>
              <div className="mt-1.5 h-4 overflow-hidden rounded-full border-2 border-ink bg-paper" aria-hidden="true">
                <div
                  className={`h-full ${item.highlight ? "bg-beam" : "bg-tape"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {caption && <p className="mt-5 text-sm text-muted">{caption}</p>}
    </figure>
  );
}
