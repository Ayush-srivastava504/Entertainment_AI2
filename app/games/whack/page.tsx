"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getGeneratedAvatars, pickRandom, type Avatar } from "@/lib/games/avatars";
import { addCoins } from "@/lib/games/wallet";
import CoinBadge from "@/components/games/CoinBadge";

const HOLES = 9;
const DURATION = 30;

export default function WhackPage() {
  const [pool, setPool] = useState<Avatar[]>([]);
  const [active, setActive] = useState<{ hole: number; avatar: Avatar; bomb: boolean } | null>(null);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(DURATION);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [earned, setEarned] = useState(0);
  const scoreRef = useRef(0);

  useEffect(() => {
    setPool(pickRandom(getGeneratedAvatars(), 8));
  }, []);

  function start() {
    setPool(pickRandom(getGeneratedAvatars(), 8));
    scoreRef.current = 0;
    setScore(0);
    setTime(DURATION);
    setDone(false);
    setEarned(0);
    setActive(null);
    setRunning(true);
  }

  useEffect(() => {
    if (!running) return;
    const clock = setInterval(() => setTime((t) => t - 1), 1000);
    return () => clearInterval(clock);
  }, [running]);

  useEffect(() => {
    if (running && time <= 0) {
      setRunning(false);
      setActive(null);
      setDone(true);
      const coins = Math.min(60, Math.max(0, scoreRef.current * 2));
      if (coins > 0) addCoins(coins);
      setEarned(coins);
    }
  }, [time, running]);

  useEffect(() => {
    if (!running || !pool.length) return;
    const t = setTimeout(
      () => {
        setActive({
          hole: Math.floor(Math.random() * HOLES),
          avatar: pool[Math.floor(Math.random() * pool.length)],
          bomb: Math.random() < 0.18,
        });
      },
      active ? 750 : 300
    );
    return () => clearTimeout(t);
  }, [running, active, pool]);

  function hit(i: number) {
    if (!running || !active || active.hole !== i) return;
    scoreRef.current = Math.max(0, scoreRef.current + (active.bomb ? -3 : 1));
    setScore(scoreRef.current);
    setActive(null);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/games" className="text-sm font-semibold text-beam hover:underline">← Games</Link>
          <h1 className="mt-1 font-display text-3xl font-extrabold">Whack-an-Avatar</h1>
        </div>
        <CoinBadge />
      </div>
      <p className="mt-2 text-sm text-muted">Tap the avatars as they pop up. Avoid the 💣 (−3). 2 coins per point (max 60).</p>
      <div className="mt-3 flex gap-4 text-sm text-muted">
        <span>Score: {score}</span>
        <span>Time: {Math.max(0, time)}s</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {Array.from({ length: HOLES }, (_, i) => {
          const show = active?.hole === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => hit(i)}
              aria-label={show ? "Whack!" : "Empty hole"}
              className="flex aspect-square items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-tape shadow-blockSm"
            >
              {show &&
                (active!.bomb ? (
                  <span className="text-4xl">💣</span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={active!.avatar.thumb} alt="" className="h-full w-full object-cover" />
                ))}
            </button>
          );
        })}
      </div>

      {done && (
        <div className="mt-5 rounded-2xl border-2 border-ink bg-surface p-5 shadow-block">
          <p className="font-display text-xl font-bold">Time! Score {score} (+{earned} coins)</p>
        </div>
      )}
      {!running && (
        <button type="button" onClick={start} className="mt-5 rounded-full bg-beam px-5 py-2.5 text-sm font-bold text-white hover:bg-beamDeep">
          {done ? "Play again" : "Start"}
        </button>
      )}
    </div>
  );
}
