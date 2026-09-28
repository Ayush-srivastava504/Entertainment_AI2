export interface FaqItem {
  q: string;
  a: string;
}

/**
 * Click-to-open question list. Every answer stays in the DOM (native
 * <details>), so it is readable by search engines and works without JS.
 * Pass `jsonLd` to also emit FAQPage structured data for the page.
 */
export function Faq({
  items,
  title = "Frequently asked questions",
  id = "faq",
  jsonLd = true,
  openFirst = true,
}: {
  items: FaqItem[];
  title?: string;
  id?: string;
  jsonLd?: boolean;
  openFirst?: boolean;
}) {
  if (items.length === 0) return null;

  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section id={id} className="scroll-mt-24">
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }}
        />
      )}
      <h2 className="font-display text-3xl font-bold tracking-tight text-ink">{title}</h2>
      <div className="mt-6 space-y-3">
        {items.map((f, i) => (
          <details
            key={f.q}
            open={openFirst && i === 0}
            className="group rounded-xl border-2 border-ink bg-surface open:shadow-blockSm"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-lg font-semibold text-ink">
              <span>{f.q}</span>
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tape text-ink transition-transform group-open:rotate-45"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
            </summary>
            <p className="guide-prose border-t-2 border-fog px-5 py-4 text-base leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
