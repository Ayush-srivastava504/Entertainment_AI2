"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addCoins } from "@/lib/games/wallet";
import CoinBadge from "@/components/games/CoinBadge";

const SIZE = 8;
const GEM_COUNT = 6;
const START_MOVES = 20;
const COINS_PER_GEM = 2;

const GEM_COLORS = ["#4C61C9", "#FF5C5C", "#5EC8FF", "#FFD36E", "#6EE7B7", "#C98BFF"];

type Grid = number[]; // SIZE*SIZE, index = row*SIZE+col, -1 = empty

const idx = (r: number, c: number) => r * SIZE + c;
const randomGem = () => Math.floor(Math.random() * GEM_COUNT);

function randomGrid(): Grid {
  // Avoid pre-made matches so the board starts clean.
  const g: Grid = new Array(SIZE * SIZE).fill(-1);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      let gem: number;
      do {
        gem = randomGem();
      } while (
        (c >= 2 && g[idx(r, c - 1)] === gem && g[idx(r, c - 2)] === gem) ||
        (r >= 2 && g[idx(r - 1, c)] === gem && g[idx(r - 2, c)] === gem)
      );
      g[idx(r, c)] = gem;
    }
  }
  return g;
}

function findMatches(g: Grid): Set<number> {
  const matched = new Set<number>();
  for (let r = 0; r < SIZE; r++) {
    let runStart = 0;
    for (let c = 1; c <= SIZE; c++) {
      const same = c < SIZE && g[idx(r, c)] === g[idx(r, runStart)] && g[idx(r, c)] !== -1;
      if (!same) {
        if (c - runStart >= 3) for (let k = runStart; k < c; k++) matched.add(idx(r, k));
        runStart = c;
      }
    }
  }
  for (let c = 0; c < SIZE; c++) {
    let runStart = 0;
    for (let r = 1; r <= SIZE; r++) {
      const same = r < SIZE && g[idx(r, c)] === g[idx(runStart, c)] && g[idx(r, c)] !== -1;
      if (!same) {
        if (r - runStart >= 3) for (let k = runStart; k < r; k++) matched.add(idx(k, c));
        runStart = r;
      }
    }
  }
  return matched;
}

function collapse(g: Grid): Grid {
  const next = [...g];
  for (let c = 0; c < SIZE; c++) {
    const col: number[] = [];
    for (let r = SIZE - 1; r >= 0; r--) {
      if (next[idx(r, c)] !== -1) col.push(next[idx(r, c)]);
    }
    while (col.length < SIZE) col.push(randomGem());
    for (let r = SIZE - 1, i = 0; r >= 0; r--, i++) {
      next[idx(r, c)] = col[i];
    }
  }
  return next;
}

export default function Match3Page() {
  const [grid, setGrid] = useState<Grid>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(START_MOVES);
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setGrid(randomGrid());
  }, []);

  function restart() {
    setGrid(randomGrid());
    setSelected(null);
    setMoves(START_MOVES);
    setScore(0);
    setBusy(false);
  }

  async function resolveCascades(startGrid: Grid) {
    setBusy(true);
    let working = startGrid;
    let totalCleared = 0;
    // small async loop so the player can see each cascade step happen
    for (;;) {
      const matched = findMatches(working);
      if (matched.size === 0) break;
      totalCleared += matched.size;
      const cleared = working.map((v, i) => (matched.has(i) ? -1 : v));
      setGrid(cleared);
      await new Promise((r) => setTimeout(r, 180));
      working = collapse(cleared);
      setGrid(working);
      await new Promise((r) => setTimeout(r, 180));
    }
    if (totalCleared > 0) {
      const coins = totalCleared * COINS_PER_GEM;
      addCoins(coins);
      setScore((s) => s + coins);
    }
    setBusy(false);
  }

  function trySwap(a: number, b: number) {
    const ra = Math.floor(a / SIZE), ca = a % SIZE;
    const rb = Math.floor(b / SIZE), cb = b % SIZE;
    const adjacent = Math.abs(ra - rb) + Math.abs(ca - cb) === 1;
    if (!adjacent) {
      setSelected(b);
      return;
    }
    const swapped = [...grid];
    [swapped[a], swapped[b]] = [swapped[b], swapped[a]];
    const hasMatch = findMatches(swapped).size > 0;
    setSelected(null);
    if (!hasMatch) {
      setGrid(swapped);
      setTimeout(() => setGrid(grid), 180); // snap back, visually shows the attempted swap
      return;
    }
    setMoves((m) => m - 1);
    setGrid(swapped);
    void resolveCascades(swapped);
  }

  function click(i: number) {
    if (busy || moves <= 0) return;
    if (selected === null) {
      setSelected(i);
      return;
    }
    if (selected === i) {
      setSelected(null);
      return;
    }
    trySwap(selected, i);
  }

  const gameOver = moves <= 0 && !busy;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/games" className="text-sm font-semibold text-beam hover:underline">
            ← Games
          </Link>
          <h1 className="mt-1 font-display text-3xl font-extrabold">Gem Match-3</h1>
        </div>
        <CoinBadge />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted">
        <span>Moves left: {moves}</span>
        <span>Coins this game: {score}</span>
      </div>

      <div
        className="mt-5 grid gap-1.5 rounded-2xl border-2 border-ink bg-surface p-2.5 shadow-block"
        style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
      >
        {grid.map((gem, i) => (
          <button
            key={i}
            type="button"
            disabled={busy || moves <= 0}
            onClick={() => click(i)}
            aria-label={`Gem ${gem}`}
            className={`aspect-square rounded-lg transition-transform ${
              selected === i ? "ring-4 ring-tape scale-95" : "hover:scale-105"
            }`}
            style={{ backgroundColor: gem === -1 ? "transparent" : GEM_COLORS[gem] }}
          />
        ))}
      </div>

      {gameOver && (
        <div className="mt-6 rounded-2xl border-2 border-ink bg-surface p-5 shadow-block">
          <p className="font-display text-xl font-bold">Out of moves -- earned {score} coins this round.</p>
          <button
            type="button"
            onClick={restart}
            className="mt-3 rounded-full bg-beam px-5 py-2.5 text-sm font-bold text-white hover:bg-beamDeep"
          >
            Play again
          </button>
        </div>
      )}
    </div>
  );
}
