"use client";

import { useEffect, useState } from "react";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import { trackEvent } from "@/lib/analytics";

interface FavoriteButtonProps {
  id: string;
  type: "anime" | "movie";
  title: string;
  tone?: "onDark" | "onLight";
}

export default function FavoriteButton({ id, type, title, tone = "onLight" }: FavoriteButtonProps) {
  const [saved, setSaved] = useState(false);

  // Read from localStorage only after mount to avoid server/client mismatch.
  useEffect(() => {
    setSaved(isFavorite(id));
  }, [id]);

  return (
    <button
      onClick={() => {
        const nowSaved = toggleFavorite({ id, type, title });
        setSaved(nowSaved);
        trackEvent(nowSaved ? "add_to_favorites" : "remove_from_favorites", {
          content_type: type,
          content_id: id,
        });
      }}
      aria-pressed={saved}
      className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold transition ${
        saved
          ? "border-ink bg-tape text-ink"
          : tone === "onDark"
            ? "border-white text-white hover:bg-white hover:text-beam"
            : "border-ink bg-surface text-ink hover:bg-tape"
      } disabled:opacity-60`}
    >
      {saved ? "★ Saved" : "☆ Save"}
    </button>
  );
}
