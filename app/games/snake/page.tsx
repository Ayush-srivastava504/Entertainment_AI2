"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { addCoins } from "@/lib/games/wallet";
import CoinBadge from "@/components/games/CoinBadge";

const SIZE = 16;
type P = { x: number; y: number };
const DIRS: Record<string, P> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

function randFood(snake: P[]): P {
  for (;;) {
    const p = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

export default function SnakePage() {
  const [snake, setSnake] = useState<P[]>([{ x: 8, y: 8 }]);
  const [food, setFood] = useState<P>({ x: 3, y: 3 });
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const [earned, setEarned] = useState(0);
  const dir = useRef<P>(DIRS.right);
  const queued = useRef<P>(DIRS.right);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const turn = useCallback((name: string) => {
    const d = DIRS[name];
    if (d.x === -dir.current.x && d.y === -dir.current.y) return;
    queued.current = d;
  }, []);

  const start = () => {
    const s = [{ x: 8, y: 8 }];
    setSnake(s);
    setFood(randFood(s));
    dir.current = DIRS.right;
    queued.current = DIRS.right;
    setScore(0);
    setEarned(0);
    setOver(false);
    setRunning(true);
  };

  useEffect(() => {
    const map: Record<string, string> = {
      ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      w: "up", s: "down", a: "left", d: "right",
    };
    const h = (e: KeyboardEvent) => {
      const d = map[e.key];
      if (d) {
        e.preventDefault();
        turn(d);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [turn]);

  useEffect(() => {
    if (!running) return;
    const speed = Math.max(60, 150 - score * 4);
    const t = setTimeout(() => {
      dir.current = queued.current;
      const head = { x: snake[0].x + dir.current.x, y: snake[0].y + dir.current.y };
      const hitWall = head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE;
      const hitSelf = snake.some((s) => s.x === head.x && s.y === head.y);
      if (hitWall || hitSelf) {
        setRunning(false);
        setOver(true);
        const coins = Math.min(80, score * 3);
        if (coins > 0) addCoins(coins);
        setEarned(coins);
        return;
      }
      const ate = head.x === food.x && head.y === food.y;
      const next = [head, ...snake];
      if (!ate) next.pop();
      else {
        setScore((s) => s + 1);
        setFood(randFood(next));
      }
      setSnake(next);
    }, speed);
    return () => clearTimeout(t);
  }, [running, snake, food, score]);

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/games" className="text-sm font-semibold text-beam hover:underline">← Games</Link>
          <h1 className="mt-1 font-display text-3xl font-extrabold">Snake</h1>
        </div>
        <CoinBadge />
      </div>
      <p className="mt-2 text-sm text-muted">Arrow keys / WASD / swipe. 3 coins per 🍓 (max 80).</p>
      <p className="mt-1 text-sm text-muted">Score: {score}</p>

      <div
        className="mt-3 grid touch-none rounded-2xl border-2 border-ink bg-surface p-1 shadow-block"
        style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const t = touch.current;
          if (!t) return;
          const dx = e.changedTouches[0].clientX - t.x;
          const dy = e.changedTouches[0].clientY - t.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
          turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
        }}
      >
        {Array.from({ length: SIZE * SIZE }, (_, i) => {
          const x = i % SIZE, y = Math.floor(i / SIZE);
          const idx = snake.findIndex((s) => s.x === x && s.y === y);
          const isFood = food.x === x && food.y === y;
          return (
            <div
              key={i}
              className={`flex aspect-square items-center justify-center text-[10px] ${
                idx === 0 ? "rounded bg-beamDeep" : idx > 0 ? "rounded-sm bg-beam" : ""
              }`}
            >
              {isFood ? "🍓" : ""}
            </div>
          );
        })}
      </div>

      {over && (
        <div className="mt-5 rounded-2xl border-2 border-ink bg-surface p-5 shadow-block">
          <p className="font-display text-xl font-bold">Game over! Score {score} (+{earned} coins)</p>
        </div>
      )}
      {!running && (
        <button type="button" onClick={start} className="mt-5 rounded-full bg-beam px-5 py-2.5 text-sm font-bold text-white hover:bg-beamDeep">
          {over ? "Play again" : "Start"}
        </button>
      )}
    </div>
  );
}
