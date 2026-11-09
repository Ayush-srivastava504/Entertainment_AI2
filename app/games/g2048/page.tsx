"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { addCoins } from "@/lib/games/wallet";
import CoinBadge from "@/components/games/CoinBadge";

const N = 4;
type Board = number[][];
type Dir = "left" | "up" | "right" | "down";

const empty = (): Board => Array.from({ length: N }, () => Array(N).fill(0));

function addTile(b: Board): Board {
  const cells: [number, number][] = [];
  b.forEach((row, r) => row.forEach((v, c) => v === 0 && cells.push([r, c])));
  if (!cells.length) return b;
  const [r, c] = cells[Math.floor(Math.random() * cells.length)];
  const nb = b.map((row) => [...row]);
  nb[r][c] = Math.random() < 0.9 ? 2 : 4;
  return nb;
}

function slideRow(row: number[]): { row: number[]; gained: number } {
  const vals = row.filter(Boolean);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] === vals[i + 1]) {
      out.push(vals[i] * 2);
      gained += vals[i] * 2;
      i++;
    } else out.push(vals[i]);
  }
  while (out.length < N) out.push(0);
  return { row: out, gained };
}

// Rotate 90 degrees clockwise.
function rotate(b: Board): Board {
  return b.map((_, r) => b.map((__, c) => b[N - 1 - c][r]));
}

function move(b: Board, dir: Dir) {
  // Rotations (clockwise) that bring `dir` to the left.
  const rots = { left: 0, down: 1, right: 2, up: 3 }[dir];
  let t = b;
  for (let i = 0; i < rots; i++) t = rotate(t);
  let gained = 0;
  t = t.map((row) => {
    const r = slideRow(row);
    gained += r.gained;
    return r.row;
  });
  for (let i = 0; i < (4 - rots) % 4; i++) t = rotate(t);
  const moved = t.some((row, r) => row.some((v, c) => v !== b[r][c]));
  return { board: t, gained, moved };
}

function canMove(b: Board) {
  return (["left", "up", "right", "down"] as const).some((d) => move(b, d).moved);
}

const COLORS: Record<number, string> = {
  0: "bg-surface/60",
  2: "bg-yellow-100 text-ink",
  4: "bg-yellow-200 text-ink",
  8: "bg-orange-300 text-ink",
  16: "bg-orange-400 text-white",
  32: "bg-red-400 text-white",
  64: "bg-red-500 text-white",
  128: "bg-pink-400 text-white",
  256: "bg-pink-500 text-white",
  512: "bg-purple-500 text-white",
  1024: "bg-indigo-500 text-white",
  2048: "bg-beam text-white",
};

export default function Game2048Page() {
  const [board, setBoard] = useState<Board>(empty());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [earned, setEarned] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback(() => {
    setBoard(addTile(addTile(empty())));
    setScore(0);
    setOver(false);
    setEarned(0);
  }, []);

  useEffect(() => {
    start();
    try {
      setBest(Number(localStorage.getItem("animegirl4u:2048best")) || 0);
    } catch {}
  }, [start]);

  const act = useCallback(
    (dir: Dir) => {
      if (over) return;
      const res = move(board, dir);
      if (!res.moved) return;
      const nb = addTile(res.board);
      setBoard(nb);
      const ns = score + res.gained;
      setScore(ns);
      if (ns > best) {
        setBest(ns);
        try {
          localStorage.setItem("animegirl4u:2048best", String(ns));
        } catch {}
      }
      if (!canMove(nb)) {
        const coins = Math.min(100, Math.floor(ns / 40));
        if (coins > 0) addCoins(coins);
        setEarned(coins);
        setOver(true);
      }
    },
    [board, score, best, over]
  );

  useEffect(() => {
    const map: Record<string, Dir> = {
      ArrowLeft: "left", ArrowUp: "up", ArrowRight: "right", ArrowDown: "down",
      a: "left", w: "up", d: "right", s: "down",
    };
    const h = (e: KeyboardEvent) => {
      const d = map[e.key];
      if (d) {
        e.preventDefault();
        act(d);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [act]);

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/games" className="text-sm font-semibold text-beam hover:underline">← Games</Link>
          <h1 className="mt-1 font-display text-3xl font-extrabold">2048</h1>
        </div>
        <CoinBadge />
      </div>
      <p className="mt-2 text-sm text-muted">Arrow keys / swipe to merge tiles. Earn 1 coin per 40 points (max 100).</p>
      <div className="mt-3 flex gap-4 text-sm text-muted">
        <span>Score: {score}</span>
        <span>Best: {best}</span>
      </div>

      <div
        className="mt-4 grid touch-none grid-cols-4 gap-2 rounded-2xl border-2 border-ink bg-tape p-2 shadow-block"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const t = touch.current;
          if (!t) return;
          const dx = e.changedTouches[0].clientX - t.x;
          const dy = e.changedTouches[0].clientY - t.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
          act(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
        }}
      >
        {board.flat().map((v, i) => (
          <div
            key={i}
            className={`flex aspect-square items-center justify-center rounded-lg font-display text-xl font-extrabold sm:text-2xl ${COLORS[v] ?? "bg-ink text-white"}`}
          >
            {v || ""}
          </div>
        ))}
      </div>

      {over && (
        <div className="mt-5 rounded-2xl border-2 border-ink bg-surface p-5 shadow-block">
          <p className="font-display text-xl font-bold">Game over! Score {score} (+{earned} coins)</p>
        </div>
      )}
      <button
        type="button"
        onClick={start}
        className="mt-5 rounded-full bg-beam px-5 py-2.5 text-sm font-bold text-white hover:bg-beamDeep"
      >
        {over ? "Play again" : "Restart"}
      </button>
    </div>
  );
}
