"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FavoriteItem, getFavorites, removeFavorite } from "@/lib/favorites";

export default function FavoritesPage() {
  const [items, setItems] = useState<FavoriteItem[] | null>(null);

  function refresh() {
    setItems(getFavorites());
  }

  useEffect(() => {
    refresh();
    window.addEventListener("marquee:favorites-changed", refresh);
    return () =>
      window.removeEventListener("marquee:favorites-changed", refresh);
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Saved titles</h1>
      <p className="mt-4 font-body text-lg text-muted">
        Saved on this device only. There is no account, so this list lives in your browser.
      </p>

      {items === null && <p className="mt-8 font-semibold text-muted">Loading your list…</p>}

      {items && items.length === 0 && (
        <div className="mt-8 rounded-2xl border-2 border-ink bg-surface p-8">
          <p className="font-display text-2xl font-bold">Nothing saved yet</p>
          <p className="mt-2 font-body text-lg text-muted">
            Press Save on any{" "}
            <Link href="/ending-explained" className="font-semibold text-beam underline">
              ending explained guide
            </Link>{" "}
            to keep it here.
          </p>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="mt-8 space-y-3">
          {items.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-4 rounded-2xl border-2 border-ink bg-surface p-5">
              <div className="min-w-0">
                <span className="mr-3 rounded-full border-2 border-ink bg-tape px-2.5 py-0.5 text-xs font-bold">
                  {f.type === "anime" ? "Anime" : "Movie"}
                </span>
                <span className="font-display text-xl font-bold">{f.title}</span>
              </div>
              <button
                onClick={() => removeFavorite(f.id)}
                className="shrink-0 rounded-full border-2 border-ink px-4 py-1.5 text-sm font-bold hover:bg-cue hover:text-white"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
