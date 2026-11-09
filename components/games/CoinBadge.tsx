"use client";

import { useEffect, useState } from "react";
import { COINS_CHANGED_EVENT, getCoins } from "@/lib/games/wallet";

export default function CoinBadge({ className = "" }: { className?: string }) {
  const [coins, setCoins] = useState<number | null>(null);

  useEffect(() => {
    const refresh = () => setCoins(getCoins());
    refresh();
    window.addEventListener(COINS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(COINS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-surface px-3 py-1 text-sm font-bold text-ink ${className}`}
      title="Coins earned playing games on this device"
    >
      <span aria-hidden="true">🪙</span>
      {coins === null ? "…" : coins.toLocaleString()}
    </span>
  );
}
