import Link from "next/link";

/**
 * Plain-<a> pagination. Crawlers follow these links, so every page of the
 * hub (and every guide on it) becomes reachable without the sitemap.
 */
export function Pagination({
  page,
  totalPages,
  basePath,
  params = {},
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params?: Record<string, string>;
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const qs = new URLSearchParams(params);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  // 1 ... (page-2 .. page+2) ... last
  const nums = new Set<number>([1, totalPages]);
  for (let p = page - 2; p <= page + 2; p++) if (p >= 1 && p <= totalPages) nums.add(p);
  const sorted = [...nums].sort((a, b) => a - b);

  const base = "rounded-full border-2 border-ink px-4 py-2 font-bold transition";
  return (
    <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={href(page - 1)} rel="prev" className={`${base} bg-surface hover:bg-tape`}>
          Newer
        </Link>
      )}
      {sorted.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - sorted[i - 1] > 1 && <span aria-hidden="true">…</span>}
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={`${base} ${p === page ? "bg-ink text-white" : "bg-surface hover:bg-tape"}`}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < totalPages && (
        <Link href={href(page + 1)} rel="next" className={`${base} bg-surface hover:bg-tape`}>
          Older
        </Link>
      )}
    </nav>
  );
}
