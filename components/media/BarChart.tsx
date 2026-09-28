import Link from "next/link";

export interface BarChartItem {
  label: string;
  value: number;
  href?: string;
  highlight?: boolean;
}

/**
 * Horizontal bar chart drawn with plain HTML/CSS (no chart library, so it
 * server-renders and adds no client JS). Values are real data only — the
 * caller decides what to plot. `max` is the full-bar value (10 for ratings).
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
    <figure className="rounded border border-marquee-line bg-marquee-panel p-5">
      <figcaption className="font-display text-xl text-marquee-text">{title}</figcaption>
      <ul className="mt-4 space-y-3">
        {items.map((item) => {
          const pct = Math.max(0, Math.min(100, (item.value / max) * 100));
          const label = item.href ? (
            <Link href={item.href} className="hover:text-marquee-gold hover:underline">
              {item.label}
            </Link>
          ) : (
            item.label
          );
          return (
            <li key={item.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={`truncate ${item.highlight ? "font-semibold text-marquee-gold" : "text-marquee-text"}`}>
                  {label}
                </span>
                <span className="shrink-0 font-mono text-xs text-marquee-textDim">
                  {item.value.toFixed(1)}
                  {unit}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-marquee-line" aria-hidden="true">
                <div
                  className={`h-full rounded-full ${item.highlight ? "bg-marquee-gold" : "bg-marquee-textDim"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {caption && <p className="mt-4 text-xs text-marquee-textDim">{caption}</p>}
    </figure>
  );
}
