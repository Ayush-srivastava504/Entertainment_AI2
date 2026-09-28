import Link from "next/link";
import { SearchBar } from "@/components/media/SearchBar";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <p className="inline-block rounded-full border-2 border-ink bg-cue px-3 py-1 text-sm font-bold text-white">404, page not found</p>
      <h1 className="mt-5 font-display text-5xl font-extrabold leading-tight tracking-tight">That page is not in this reel.</h1>
      <p className="mt-4 font-body text-xl text-muted">
        The link may be old, or the guide is not published yet. Search for the title instead.
      </p>
      <div className="mt-8 max-w-xl">
        <SearchBar path="/search" />
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/ending-explained" className="rounded-full border-2 border-ink bg-tape px-5 py-2.5 font-bold">Ending explained</Link>
        <Link href="/watch-order" className="rounded-full border-2 border-ink bg-surface px-5 py-2.5 font-bold">Watch order</Link>
        <Link href="/" className="rounded-full border-2 border-ink bg-surface px-5 py-2.5 font-bold">Home</Link>
      </div>
    </div>
  );
}
