"use client";

import { useState } from "react";
import Link from "next/link";
import { addCoins, getCoins, spendCoins } from "@/lib/games/wallet";
import { SPIN_COST, WHEEL_SEGMENTS } from "@/lib/games/spin";
import CoinBadge from "@/components/games/CoinBadge";
import type { GifItem } from "@/lib/api/gifs";

const SEGMENT_COLORS = ["#4C61C9", "#FF5C5C", "#5EC8FF", "#FFD36E", "#6EE7B7", "#C98BFF", "#2A3466"];
const SEGMENT_ANGLE = 360 / WHEEL_SEGMENTS.length;

type SpinResult = { type: "gif"; tag: string; item: GifItem } | { type: "coins"; amount: number };

function wheelBackground() {
  const stops = WHEEL_SEGMENTS.map((_, i) => {
    const from = i * SEGMENT_ANGLE;
    const to = (i + 1) * SEGMENT_ANGLE;
    return `${SEGMENT_COLORS[i % SEGMENT_COLORS.length]} ${from}deg ${to}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export default function SpinPage() {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function spin() {
    if (spinning) return;
    setError(null);
    setResult(null);

    if (getCoins() < SPIN_COST) {
      setError(`You need ${SPIN_COST} coins to spin. Play a game to earn more.`);
      return;
    }

    setSpinning(true);
    const refunded = spendCoins(SPIN_COST);
    if (!refunded) {
      setSpinning(false);
      setError("Something changed your balance -- try again.");
      return;
    }

    let data: SpinResult;
    try {
      const res = await fetch("/api/games/spin", { method: "POST" });
      if (!res.ok) throw new Error("spin request failed");
      data = await res.json();
    } catch {
      addCoins(SPIN_COST); // refund the spend since nothing was won
      setSpinning(false);
      setError("The wheel didn't respond -- your coins were refunded, try again.");
      return;
    }

    const labelIndex =
      data.type === "coins" ? WHEEL_SEGMENTS.length - 1 : WHEEL_SEGMENTS.indexOf(data.tag);
    const segmentIndex = labelIndex === -1 ? 0 : labelIndex;
    const segmentCenter = segmentIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const jitter = (Math.random() - 0.5) * (SEGMENT_ANGLE * 0.5);
    const fullSpins = 5 + Math.floor(Math.random() * 3);
    const target = fullSpins * 360 + (360 - segmentCenter + jitter);

    setRotation((r) => r + target);

    setTimeout(() => {
      setSpinning(false);
      setResult(data);
      if (data.type === "coins") addCoins(data.amount);
    }, 4200);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 text-center sm:px-6">
      <div className="flex items-center justify-between gap-3 text-left">
        <Link href="/games" className="text-sm font-semibold text-beam hover:underline">
          ← Games
        </Link>
        <CoinBadge />
      </div>

      <h1 className="mt-2 font-display text-3xl font-extrabold">Spin for a GIF or sticker</h1>
      <p className="mt-2 text-muted">Each spin costs {SPIN_COST} coins. Earn coins by playing the mini-games.</p>

      <div className="relative mx-auto mt-8 h-64 w-64">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[-6px] z-10 h-5 w-5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-ink bg-tape"
        />
        <div
          className="h-64 w-64 rounded-full border-4 border-ink shadow-block transition-transform duration-[4000ms] ease-[cubic-bezier(0.17,0.67,0.12,0.99)]"
          style={{ background: wheelBackground(), transform: `rotate(${rotation}deg)` }}
        />
      </div>

      <ul className="mx-auto mt-5 flex max-w-sm flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted">
        {WHEEL_SEGMENTS.map((label, i) => (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
            />
            {label}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={spin}
        disabled={spinning}
        className="mt-6 rounded-full bg-beam px-8 py-3 text-base font-bold text-white hover:bg-beamDeep disabled:opacity-50"
      >
        {spinning ? "Spinning…" : `Spin (${SPIN_COST} coins)`}
      </button>

      {error && <p className="mt-4 text-sm font-semibold text-cue">{error}</p>}

      {result && (
        <div className="mt-6 rounded-2xl border-2 border-ink bg-surface p-5 shadow-block">
          {result.type === "coins" ? (
            <p className="font-display text-xl font-bold">Bonus! +{result.amount} coins refunded.</p>
          ) : (
            <>
              <p className="font-display text-lg font-bold">You won a {result.tag} GIF!</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.item.previewUrl}
                alt={result.item.title}
                className="mx-auto mt-3 max-h-56 rounded-xl border-2 border-ink"
              />
              <div className="mt-4 flex justify-center gap-3">
                <a
                  href={result.item.fullUrl}
                  download
                  className="rounded-full bg-beam px-5 py-2 text-sm font-bold text-white hover:bg-beamDeep"
                >
                  Download
                </a>
                <Link
                  href={`/gif/${result.item.id}`}
                  className="rounded-full border-2 border-ink px-5 py-2 text-sm font-bold hover:bg-tape"
                >
                  View page
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
