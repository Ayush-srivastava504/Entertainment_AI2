"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { addCoins } from "@/lib/games/wallet";
import CoinBadge from "@/components/games/CoinBadge";

const PADS = [
  { name: "Pink", on: "#FF8FB8", off: "#B04A74" },
  { name: "Blue", on: "#5EC8FF", off: "#2F6F96" },
  { name: "Gold", on: "#FFD36E", off: "#9A7A2A" },
  { name: "Mint", on: "#6EE7B7", off: "#2F8C6A" },
];
const COINS_PER_ROUND = 3;

export default function SimonPage() {
  const [seq, setSeq] = useState<number[]>([]);
  const [lit, setLit] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "show" | "input" | "over">("idle");
  const [step, setStep] = useState(0);
  const [earned, setEarned] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);

  function playback(s: number[]) {
    clear();
    setPhase("show");
    setStep(0);
    s.forEach((p, i) => {
      timers.current.push(setTimeout(() => setLit(p), 600 + i * 700));
      timers.current.push(setTimeout(() => setLit(null), 600 + i * 700 + 450));
    });
    timers.current.push(setTimeout(() => setPhase("input"), 600 + s.length * 700));
  }

  function start() {
    const s = [Math.floor(Math.random() * 4)];
    setSeq(s);
    setEarned(0);
    playback(s);
  }

  function press(p: number) {
    if (phase !== "input") return;
    setLit(p);
    timers.current.push(setTimeout(() => setLit(null), 200));
    if (p !== seq[step]) {
      const rounds = seq.length - 1;
      const coins = rounds * COINS_PER_ROUND;
      if (coins > 0) addCoins(coins);
      setEarned(coins);
      setPhase("over");
      return;
    }
    if (step + 1 === seq.length) {
      const next = [...seq, Math.floor(Math.random() * 4)];
      setSeq(next);
      timers.current.push(setTimeout(() => playback(next), 700));
      setPhase("show");
    } else {
      setStep(step + 1);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 text-center sm:px-6">
      <div className="flex items-center justify-between gap-3 text-left">
        <Link href="/games" className="text-sm font-semibold text-beam hover:underline">← Games</Link>
        <CoinBadge />
      </div>
      <h1 className="mt-2 font-display text-3xl font-extrabold">Pattern Pop</h1>
      <p className="mt-2 text-muted">Watch the pads light up, then repeat the pattern. {COINS_PER_ROUND} coins per round cleared.</p>

      <div className="mx-auto mt-6 grid w-72 grid-cols-2 gap-3">
        {PADS.map((pad, i) => (
          <button
            key={pad.name}
            type="button"
            onClick={() => press(i)}
            disabled={phase !== "input"}
            aria-label={`${pad.name} pad`}
            className="h-32 rounded-2xl border-2 border-ink shadow-blockSm transition-colors"
            style={{ backgroundColor: lit === i ? pad.on : pad.off }}
          />
        ))}
      </div>

      <p className="mt-5 font-display text-lg font-bold" role="status">
        {phase === "idle" && "Press start when you are ready."}
        {phase === "show" && "Watch closely…"}
        {phase === "input" && `Your turn: ${step + 1} of ${seq.length}`}
        {phase === "over" && `Missed it! You cleared ${seq.length - 1} rounds${earned ? ` and earned ${earned} coins` : ""}.`}
      </p>

      {(phase === "idle" || phase === "over") && (
        <button type="button" onClick={start} className="mt-3 rounded-full bg-beam px-6 py-2 text-sm font-bold text-white hover:bg-beamDeep">
          {phase === "idle" ? "Start" : "Play again"}
        </button>
      )}
    </div>
  );
}
