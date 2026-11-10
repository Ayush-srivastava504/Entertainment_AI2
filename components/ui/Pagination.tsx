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

  // 1 ... (page-2 .. page+2) ... last, plus a jump link to every 5th page.
  // Without the jumps, page 12 of 25 sat ~6 clicks from page 1, and the
  // guides on it ~8 clicks from the homepage -- deep enough that Google
  // leaves them at "Discovered - currently not indexed". With them, every
  // page is at most 2 clicks from any other.
  const nums = new Set<number>([1, totalPages]);
  for (let p = page - 2; p <= page + 2; p++) if (p >= 1 && p <= totalPages) nums.add(p);
  for (let p = 5; p < totalPages; p += 5) nums.add(p);
  const sorted = [...nums].sort((a, b) => a - b);

  const base = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border-2 border-ink px-4 py-2 font-bold transition";
  return (
    <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-center gap-3">
      {page > 1 && (
        <Link href={href(page - 1)} rel="prev" className={`${base} bg-surface hover:bg-tape`}>
          Newer
        </Link>
      )}
      {sorted.map((p, i) => (
        <span key={p} className="flex items-center gap-3">
          {i > 0 && p - sorted[i - 1] > 1 && <span aria-hidden="true">…</span>}
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={`${base} ${p === page ? "bg-beam text-white" : "bg-surface hover:bg-tape"}`}
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
