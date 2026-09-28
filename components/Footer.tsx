import Link from "next/link";

const columns = [
  {
    title: "Guides",
    links: [
      { href: "/ending-explained", label: "Ending explained" },
      { href: "/watch-order", label: "Watch order" },
      { href: "/search", label: "Search" },
    ],
  },
  {
    title: "Site",
    links: [
      { href: "/about", label: "About Marquee" },
      { href: "/favorites", label: "Saved titles" },
      { href: "/sitemap.xml", label: "Sitemap" },
    ],
  },
];

const footerQuote = "Every ending leaves a door open.";

export default function Footer() {
  return (
    <footer className="mt-24 border-t-2 border-ink bg-ink text-white">
      <div className="slate-stripes" aria-hidden="true" />
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-3xl font-extrabold tracking-tight">Marquee</p>
          <p className="mt-3 max-w-sm font-body text-base leading-relaxed text-white/75">
            Plain-English endings for movies and anime, and the right order to watch every franchise.
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="font-display text-lg font-bold text-tape">{col.title}</p>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-white/85 hover:text-tape hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <blockquote className="text-sm italic text-white/60">
            <p>&ldquo;{footerQuote}&rdquo;</p>
          </blockquote>
        </div>
      </div>
    </footer>
  );
}
