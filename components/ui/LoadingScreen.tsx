/*
Branded loading screen shown by the route-level loading.tsx files while a page
streams in. Server component, CSS-only animation (see .ag-shimmer / .ag-bob in
globals.css), so it costs no JavaScript. The skeleton roughly matches the page
that is loading, which keeps layout shift low when the real content arrives.
*/

type Variant = "default" | "grid" | "article";

const MESSAGES: Record<Variant, string> = {
  default: "Getting things ready…",
  grid: "Gathering your favourite anime characters…",
  article: "Rewinding to the final episode…",
};

function Bar({ className = "" }: { className?: string }) {
  return <div className={`ag-shimmer rounded-full ${className}`} />;
}

export function LoadingScreen({ variant = "default", label }: { variant?: Variant; label?: string }) {
  return (
    <div className="mx-auto min-h-[100svh] max-w-6xl px-4 py-10 sm:px-6" role="status" aria-live="polite">
      {/* Brand + message */}
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt=""
          width={44}
          height={44}
          className="ag-bob h-11 w-11 rounded-full border-2 border-tape object-cover shadow-block"
        />
        <div>
          <p className="font-display text-lg font-bold text-ink">{label ?? MESSAGES[variant]}</p>
          <div className="mt-1 flex gap-1.5" aria-hidden="true">
            <span className="ag-dot h-2 w-2 rounded-full bg-tape" />
            <span className="ag-dot h-2 w-2 rounded-full bg-tape [animation-delay:150ms]" />
            <span className="ag-dot h-2 w-2 rounded-full bg-tape [animation-delay:300ms]" />
          </div>
        </div>
      </div>

      {/* Page-shaped skeleton */}
      <div className="mt-10" aria-hidden="true">
        {variant === "grid" && (
          <>
            <Bar className="h-8 w-2/3 max-w-md" />
            <Bar className="mt-3 h-4 w-1/2 max-w-sm" />
            <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 10 }, (_, i) => (
                <li key={i} className="overflow-hidden rounded-2xl border-2 border-ink/60 bg-surface">
                  <div className="ag-shimmer aspect-[3/4] w-full" />
                  <div className="space-y-2 p-3">
                    <Bar className="h-4 w-3/4" />
                    <Bar className="h-3 w-1/2" />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {variant === "article" && (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
            <div className="ag-shimmer mx-auto aspect-[2/3] w-full max-w-[260px] rounded-2xl border-2 border-ink/60" />
            <div className="min-w-0">
              <Bar className="h-4 w-28" />
              <Bar className="mt-4 h-10 w-5/6" />
              <Bar className="mt-3 h-10 w-2/3" />
              <div className="mt-8 space-y-3">
                {["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-2/3"].map((w, i) => (
                  <Bar key={i} className={`h-4 ${w}`} />
                ))}
              </div>
            </div>
          </div>
        )}

        {variant === "default" && (
          <>
            <Bar className="h-10 w-2/3 max-w-xl" />
            <Bar className="mt-5 h-5 w-1/2 max-w-md" />
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="ag-shimmer h-40 rounded-2xl border-2 border-ink/60" />
              ))}
            </div>
          </>
        )}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
