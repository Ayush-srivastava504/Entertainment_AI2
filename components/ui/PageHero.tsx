/** Full-bleed leader-blue band that opens every list page. */
export function PageHero({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-b-2 border-ink bg-beam text-white">
      <div className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
        {kicker && (
          <p className="inline-block rounded-full bg-tape px-3 py-1 text-sm font-bold text-ink">{kicker}</p>
        )}
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          {title}
        </h1>
        {subtitle && <p className="mt-5 max-w-2xl font-body text-xl leading-relaxed text-white/85">{subtitle}</p>}
        {children && <div className="mt-8 max-w-2xl">{children}</div>}
      </div>
    </section>
  );
}
