"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

interface LikeButtonProps {
  type: "movie" | "anime" | "watch-order";
  slug: string;
  initialLikes: number;
  tone?: "onDark" | "onLight";
}

// Not real vote integrity (there's no login) -- just a localStorage flag
// so the same browser can't spam the button. Good enough for a hobby
// site's trending sort, which is a rough signal, not a leaderboard.
function storageKey(type: string, slug: string) {
  return `liked:${type}:${slug}`;
}

export default function LikeButton({ type, slug, initialLikes, tone = "onLight" }: LikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setLiked(localStorage.getItem(storageKey(type, slug)) === "1");
  }, [type, slug]);

  async function handleLike() {
    if (liked || pending) return;
    setPending(true);
    setLiked(true);
    setLikes((n) => n + 1);
    localStorage.setItem(storageKey(type, slug), "1");
    trackEvent("like_content", { content_type: type, slug });

    try {
      const res = await fetch("/api/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, slug }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.likes === "number") setLikes(data.likes);
      }
    } catch {
      // Keep the optimistic UI even if the network call fails -- worst
      // case the count is off by one until next page load.
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleLike}
      disabled={liked || pending}
      aria-pressed={liked}
      className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold transition ${
        liked
          ? "border-ink bg-tape text-ink"
          : tone === "onDark"
            ? "border-white text-white hover:bg-white hover:text-beam"
            : "border-ink bg-surface text-ink hover:bg-tape"
      } disabled:opacity-60`}
    >
      {liked ? "♥ Liked" : "♡ Like"} ({likes})
    </button>
  );
}
