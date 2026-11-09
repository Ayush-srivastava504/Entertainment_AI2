"use client";

import { useState } from "react";
import Link from "next/link";
import { addCoins } from "@/lib/games/wallet";
import CoinBadge from "@/components/games/CoinBadge";

const W = 9, H = 9, MINES = 10;
type Cell = { mine: boolean; open: boolean; flag: boolean; n: number };

function neighbors(i: number): number[] {
  const x = i % W, y = Math.floor(i / W), out: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H) out.push(ny * W + nx);
    }
  return out;
}

function blank(): Cell[] {
  return Array.from({ length: W * H }, () => ({ mine: false, open: false, flag: false, n: 0 }));
}

function place(safe: number): Cell[] {
  const cells = blank();
  const banned = new Set([safe, ...neighbors(safe)]);
  let placed = 0;
  while (placed < MINES) {
    const i = Math.floor(Math.random() * W * H);
    if (cells[i].mine || banned.has(i)) continue;
    cells[i].mine = true;
    placed++;
  }
  cells.forEach((c, i) => (c.n = neighbors(i).filter((j) => cells[j].mine).length));
  return cells;
}

const NUM_COLORS = ["", "text-blue-600", "text-green-600", "text-red-600", "text-purple-700", "text-orange-700", "text-teal-600", "text-ink", "text-muted"];

export default function MinesweeperPage() {
  const [cells, setCells] = useState<Cell[]>(blank());
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<"play" | "won" | "lost">("play");
  const [flagMode, setFlagMode] = useState(false);

  function reset() {
    setCells(blank());
    setStarted(false);
    setState("play");
  }

  function reveal(i: number) {
    if (state !== "play") return;
    let cs = started ? cells.map((c) => ({ ...c })) : place(i);
    if (cs[i].flag || cs[i].open) return;
    if (!started) setStarted(true);
    if (cs[i].mine) {
      cs = cs.map((c) => (c.mine ? { ...c, open: true } : c));
      setCells(cs);
      setState("lost");
      return;
    }
    const stack = [i];
    while (stack.length) {
      const k = stack.pop()!;
      if (cs[k].open || cs[k].flag) continue;
      cs[k].open = true;
      if (cs[k].n === 0) stack.push(...neighbors(k));
    }
    setCells(cs);
    if (cs.every((c) => c.mine || c.open)) {
      setState("won");
      addCoins(50);
    }
  }

  function flag(i: number) {
    if (state !== "play" || cells[i].open) return;
    setCells(cells.map((c, k) => (k === i ? { ...c, flag: !c.flag } : c)));
  }

  const flags = cells.filter((c) => c.flag).length;

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/games" className="text-sm font-semibold text-beam hover:underline">← Games</Link>
          <h1 className="mt-1 font-display text-3xl font-extrabold">Minesweeper</h1>
        </div>
        <CoinBadge />
      </div>
      <p className="mt-2 text-sm text-muted">Clear the board without hitting a mine. Right-click (or flag mode) to flag. Win = 50 coins.</p>
      <div className="mt-3 flex items-center gap-4 text-sm text-muted">
        <span>💣 {MINES - flags}</span>
        <button
          type="button"
          onClick={() => setFlagMode((f) => !f)}
          className={`rounded-full border-2 border-ink px-3 py-1 text-xs font-bold ${flagMode ? "bg-beam text-white" : ""}`}
        >
          🚩 Flag mode {flagMode ? "on" : "off"}
        </button>
      </div>

      <div className="mt-3 grid rounded-2xl border-2 border-ink bg-tape p-1.5 shadow-block" style={{ gridTemplateColumns: `repeat(${W}, 1fr)`, gap: 3 }}>
        {cells.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => (flagMode ? flag(i) : reveal(i))}
            onContextMenu={(e) => {
              e.preventDefault();
              flag(i);
            }}
            className={`aspect-square rounded text-sm font-extrabold ${
              c.open ? (c.mine ? "bg-red-400" : "bg-surface") : "bg-beam/70 hover:bg-beam"
            } ${NUM_COLORS[c.n] ?? ""}`}
          >
            {c.open ? (c.mine ? "💣" : c.n || "") : c.flag ? "🚩" : ""}
          </button>
        ))}
      </div>

      {state !== "play" && (
        <div className="mt-5 rounded-2xl border-2 border-ink bg-surface p-5 shadow-block">
          <p className="font-display text-xl font-bold">{state === "won" ? "You cleared it! +50 coins" : "Boom! Better luck next time."}</p>
        </div>
      )}
      <button type="button" onClick={reset} className="mt-5 rounded-full bg-beam px-5 py-2.5 text-sm font-bold text-white hover:bg-beamDeep">
        {state === "play" ? "Restart" : "Play again"}
      </button>
    </div>
  );
}
