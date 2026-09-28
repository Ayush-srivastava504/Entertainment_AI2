import Link from "next/link";

export function CtaBand({
  title,
  text,
  primary,
  secondary,
}: {
  title: string;
  text: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="border-y-2 border-ink bg-tape">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink">{title}</h2>
          <p className="mt-2 font-body text-lg text-ink/80">{text}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={primary.href}
            className="rounded-full border-2 border-ink bg-ink px-6 py-3 font-bold text-white shadow-blockSm transition hover:-translate-y-0.5"
          >
            {primary.label}
          </Link>
          {secondary && (
            <Link
              href={secondary.href}
              className="rounded-full border-2 border-ink bg-surface px-6 py-3 font-bold text-ink transition hover:-translate-y-0.5"
            >
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
