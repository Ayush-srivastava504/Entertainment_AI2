"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

const links = [
  { href: "/ending-explained", label: "Ending explained" },
  { href: "/watch-order", label: "Watch order" },
  { href: "/about", label: "About" },
];

function CueMark() {
  // Two changeover cue marks, as burned into the corner of a film reel.
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="9" cy="13" r="7.5" fill="#2A3FF0" stroke="#0D1030" strokeWidth="2" />
      <circle cx="18" cy="13" r="4.5" fill="#FFD23F" stroke="#0D1030" strokeWidth="2" />
    </svg>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded">
          <CueMark />
          <span className="font-display text-2xl font-extrabold tracking-tight text-ink">Marquee</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-[15px] font-semibold transition-colors ${
                isActive(l.href) ? "bg-ink text-white" : "text-ink hover:bg-tape"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/favorites"
            className="ml-1 rounded-full border-2 border-ink px-4 py-1.5 text-[15px] font-semibold text-ink transition-colors hover:bg-tape"
          >
            Saved
          </Link>
          <Link
            href="/search"
            aria-label="Search"
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-beam text-white transition-colors hover:bg-beamDeep"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" strokeWidth="2" />
              <path d="M13 13l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink text-ink md:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            {open ? (
              <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M2 4.5H16M2 9H16M2 13.5H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="flex flex-col gap-1 border-t-2 border-ink bg-surface px-4 py-3 md:hidden">
          {[...links, { href: "/search", label: "Search" }, { href: "/favorites", label: "Saved" }].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`rounded-lg px-3 py-3 text-lg font-semibold ${isActive(l.href) ? "bg-ink text-white" : "text-ink hover:bg-tape"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
