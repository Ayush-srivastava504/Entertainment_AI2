"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { addCoins } from "@/lib/games/wallet";
import CoinBadge from "@/components/games/CoinBadge";

const ROUNDS = 5;

function coinsFor(avgMs: number) {
  if (avgMs < 250) return 30;
  if (avgMs < 350) return 20;
  if (avgMs < 500) return 12;
  return 5;
}

export default function ReactionPage() {
  const [phase, setPhase] = useState<"idle" | "wait" | "go" | "early" | "done">("idle");
  const [times, setTimes] = useState<number[]>([]);
  const [earned, setEarned] = useState(0);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function arm() {
    setPhase("wait");
    timer.current = setTimeout(() => {
      startedAt.current = performance.now();
      setPhase("go");
    }, 1200 + Math.random() * 2800);
  }

  function begin() {
    setTimes([]);
    setEarned(0);
    arm();
  }

  function tap() {
    if (phase === "wait") {
      if (timer.current) clearTimeout(timer.current);
      setPhase("early");
      return;
    }
    if (phase === "go") {
      const ms = Math.round(performance.now() - startedAt.current);
      const next = [...times, ms];
      setTimes(next);
      if (next.length >= ROUNDS) {
        const avg = next.reduce((a, b) => a + b, 0) / next.length;
        const coins = coinsFor(avg);
        addCoins(coins);
        setEarned(coins);
        setPhase("done");
      } else {
        arm();
      }
    }
  }

  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const bg = phase === "go" ? "#6EE7B7" : phase === "wait" ? "#FF5C5C" : "#FFD36E";

  return (
    <div className="mx-auto max-w-md px-4 py-10 text-center sm:px-6">
      <div className="flex items-center justify-between gap-3 text-left">
        <Link href="/games" className="text-sm font-semibold text-beam hover:underline">← Games</Link>
        <CoinBadge />
      </div>
      <h1 className="mt-2 font-display text-3xl font-extrabold">Reaction Rush</h1>
      <p className="mt-2 text-muted">Tap the moment the box turns green. {ROUNDS} rounds; faster average, more coins.</p>

      <button
        type="button"
        onClick={phase === "wait" || phase === "go" ? tap : undefined}
        aria-label="Reaction pad"
        className="mx-auto mt-6 flex h-56 w-full max-w-xs items-center justify-center rounded-2xl border-2 border-ink font-display text-xl font-extrabold text-ink shadow-block"
        style={{ backgroundColor: bg }}
      >
        {phase === "idle" && "Ready?"}
        {phase === "wait" && "Wait for green…"}
        {phase === "go" && "TAP!"}
        {phase === "early" && "Too early!"}
        {phase === "done" && `${avg} ms average`}
      </button>

      {times.length > 0 && (
        <p className="mt-3 text-sm text-muted">
          Round times: {times.map((t) => `${t} ms`).join(", ")}
        </p>
      )}
      {phase === "done" && <p className="mt-2 font-display text-lg font-bold" role="status">+{earned} coins</p>}

      {(phase === "idle" || phase === "done") && (
        <button type="button" onClick={begin} className="mt-4 rounded-full bg-beam px-6 py-2 text-sm font-bold text-white hover:bg-beamDeep">
          {phase === "idle" ? "Start" : "Play again"}
        </button>
      )}
      {phase === "early" && (
        <button type="button" onClick={arm} className="mt-4 rounded-full bg-beam px-6 py-2 text-sm font-bold text-white hover:bg-beamDeep">
          Try this round again
        </button>
      )}
    </div>
  );
}
