"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-display text-5xl font-extrabold leading-tight tracking-tight">This page failed to load.</h1>
      <p className="mt-4 font-body text-xl text-muted">
        Something went wrong on our side. Try again; if it keeps failing, come back in a few minutes.
      </p>
      <button
        onClick={() => reset()}
        className="mt-8 rounded-full border-2 border-ink bg-beam px-6 py-3 font-bold text-white shadow-blockSm transition hover:bg-beamDeep"
      >
        Try again
      </button>
    </div>
  );
}
