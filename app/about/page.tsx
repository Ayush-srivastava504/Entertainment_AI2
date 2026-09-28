import Link from "next/link";
import { getBaseUrl } from "@/lib/site";
const BASE_URL = getBaseUrl();

export const metadata = {
  title: "About | Marquees",
  description: "What Marquees is, how its guides are made, and how to reach us.",
  alternates: { canonical: `${BASE_URL}/about` },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">ℹ ABOUT</p>
      <h1 className="mt-3 font-display text-3xl sm:text-5xl text-marquee-text">About Marquees</h1>

      <div className="mt-8 space-y-6 text-marquee-textDim">
        <p>
          Marquees publishes two kinds of guide: <Link href="/ending-explained" className="font-semibold text-marquee-gold hover:underline">Ending Explained</Link>{" "}
          breakdowns of how a movie or anime actually ends, and{" "}
          <Link href="/watch-order" className="font-semibold text-marquee-gold hover:underline">Watch Order</Link> guides for the right order to watch a
          franchise.
        </p>
        <p>
          Every Ending Explained guide starts from factual plot, cast, and trivia data, then is written up
          in original language — never copied from another source — and reviewed for length and accuracy
          before it&apos;s published. Watch Order guides are drafted from release-date data and then
          reviewed by a human editor before going live, since getting a watch order wrong is worse than not
          publishing one at all.
        </p>
        <p>
          Looking for something specific? <Link href="/search" className="text-marquee-gold hover:underline">Search the guides</Link>.
        </p>
        <p>
          Comments and likes on each guide come from real readers — there&apos;s no account system, so
          they&apos;re tied to your browser, not an identity.
        </p>
        <p>
          Questions, corrections, or a franchise you&apos;d like covered? Reach out via the contact link in
          the footer.
        </p>
      </div>
    </div>
  );
}
