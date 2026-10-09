import Link from "next/link";

export type BreadcrumbItem = { name: string; href?: string };

/**
 * Visual breadcrumb trail, styled for the blue hero band (white text).
 * The last item (no href) is the current page. Structured data is emitted
 * separately via breadcrumbNode() in lib/jsonld.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="font-body text-sm text-white/80">
      <ol className="flex flex-wrap items-center gap-x-2">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.name}-${i}`} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link href={item.href} className="inline-flex min-h-11 min-w-11 items-center px-1 underline-offset-4 hover:text-white hover:underline">
                  {item.name}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className={`inline-flex min-h-11 items-center px-1 ${isLast ? "font-bold text-white" : ""}`}>
                  {item.name}
                </span>
              )}
              {!isLast && <span aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
