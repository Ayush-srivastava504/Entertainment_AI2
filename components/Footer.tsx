import Link from "next/link";
export default function Footer() {
  return (
    <footer className="border-t border-marquee-line mt-24">
      <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="bulb-row" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="bulb"
              style={{ animationDelay: `${i * 0.25}s` }}
            />
          ))}
        </div>
        <nav aria-label="Footer" className="flex gap-5 text-xs font-mono text-marquee-textDim">
          <Link href="/ending-explained" className="hover:text-marquee-gold">Ending Explained</Link>
          <Link href="/watch-order" className="hover:text-marquee-gold">Watch Order</Link>
          <Link href="/search" className="hover:text-marquee-gold">Search</Link>
          <Link href="/about" className="hover:text-marquee-gold">About</Link>
        </nav>
        <p className="text-xs text-marquee-textDim font-mono">
          Marquees — Ending Explained &amp; Watch Order guides. AI-assisted, human-reviewed.
        </p>
      </div>
    </footer>
  );
}
