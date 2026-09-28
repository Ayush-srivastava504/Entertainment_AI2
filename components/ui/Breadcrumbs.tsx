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
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.name}-${i}`} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link href={item.href} className="underline-offset-4 hover:text-white hover:underline">
                  {item.name}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className={isLast ? "font-bold text-white" : undefined}>
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
