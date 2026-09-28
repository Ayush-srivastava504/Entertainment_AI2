import Link from "next/link";
import { getBaseUrl } from "@/lib/site";
import { getAllPublishedFranchises } from "@/lib/api/franchises";

const BASE_URL = getBaseUrl();

export const metadata = {
  title: "Watch Order Guides | Marquees",
  description: "The correct order to watch every franchise — release order, chronological order, or the best-experience recommended order.",
  alternates: { canonical: `${BASE_URL}/watch-order` },
};

export default async function WatchOrderIndexPage() {
  const franchises = await getAllPublishedFranchises();

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">🎞 WATCH ORDER</p>
      <h1 className="mt-3 font-display text-3xl sm:text-5xl text-marquee-text">
        Franchise watch order guides
      </h1>
      <p className="mt-4 max-w-2xl text-marquee-textDim">
        Every entry, in the order that actually makes sense — plus why, when release order
        and story order don&apos;t agree.
      </p>

      {franchises.length === 0 ? (
        <p className="mt-10 text-marquee-textDim">No watch order guides published yet — check back soon.</p>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {franchises.map((f) => (
            <Link
              key={f.id}
              href={`/watch-order/${f.slug}`}
              className="ticket block p-5 pl-8 transition hover:border-marquee-gold"
            >
              <h2 className="font-display text-2xl text-marquee-text">{f.title}</h2>
              {f.intro && <p className="mt-2 text-sm text-marquee-textDim line-clamp-3">{f.intro}</p>}
            </Link>
          ))}
        </div>
      )}

      <p className="mt-12 text-sm text-marquee-textDim">
        Finished a title and want to know what actually happened?{" "}
        <Link href="/ending-explained" className="text-marquee-gold hover:underline">
          Read the Ending Explained guides
        </Link>{" "}
        or <Link href="/search" className="text-marquee-gold hover:underline">search by title</Link>.
      </p>
    </div>
  );
}
