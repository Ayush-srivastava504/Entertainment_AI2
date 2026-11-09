"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { addCoins } from "@/lib/games/wallet";
import CoinBadge from "@/components/games/CoinBadge";

// Classic 15-puzzle. The board is shuffled by making random legal moves from
// the solved state, so every deal is solvable.
const N = 4;
const SOLVED = [...Array.from({ length: N * N - 1 }, (_, i) => i + 1), 0];
const COLORS = ["#4C61C9", "#5EC8FF", "#FF8FB8", "#FFD36E"]; // one per starting row, so the goal is easy to read

function neighbours(i: number): number[] {
  const r = Math.floor(i / N);
  const c = i % N;
  const out: number[] = [];
  if (r > 0) out.push(i - N);
  if (r < N - 1) out.push(i + N);
  if (c > 0) out.push(i - 1);
  if (c < N - 1) out.push(i + 1);
  return out;
}

function shuffled(): number[] {
  const t = [...SOLVED];
  let blank = t.indexOf(0);
  let prev = -1;
  for (let k = 0; k < 200; k++) {
    const opts = neighbours(blank).filter((x) => x !== prev);
    const pick = opts[Math.floor(Math.random() * opts.length)];
    [t[blank], t[pick]] = [t[pick], t[blank]];
    prev = blank;
    blank = pick;
  }
  return isSolved(t) ? shuffled() : t;
}

function isSolved(t: number[]) {
  return t.every((v, i) => v === SOLVED[i]);
}

// Fewer moves pays more; any finish pays at least 10.
function coinsFor(moves: number) {
  return Math.max(10, 80 - Math.floor(moves / 4));
}

export default function SlidePuzzlePage() {
  const [tiles, setTiles] = useState<number[]>(SOLVED);
  const [moves, setMoves] = useState(0);
  const [state, setState] = useState<"idle" | "playing" | "won">("idle");
  const [earned, setEarned] = useState(0);

  const start = () => {
    setTiles(shuffled());
    setMoves(0);
    setEarned(0);
    setState("playing");
  };

  // Tapping any tile in the blank's row or column slides the whole run toward the blank.
  const tap = useCallback(
    (i: number) => {
      if (state !== "playing") return;
      const blank = tiles.indexOf(0);
      const [br, bc, r, c] = [Math.floor(blank / N), blank % N, Math.floor(i / N), i % N];
      if (i === blank || (br !== r && bc !== c)) return;
      const delta = br === r ? (c > bc ? 1 : -1) : r > br ? N : -N;
      const next = [...tiles];
      let pos = blank;
      let count = 0;
      while (pos !== i) {
        next[pos] = next[pos + delta];
        pos += delta;
        count++;
      }
      next[i] = 0;
      const total = moves + count;
      setTiles(next);
      setMoves(total);
      if (isSolved(next)) {
        const coins = coinsFor(total);
        addCoins(coins);
        setEarned(coins);
        setState("won");
      }
    },
    [state, tiles, moves],
  );

  // Arrow keys move the tile next to the blank into it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state !== "playing") return;
      const blank = tiles.indexOf(0);
      const map: Record<string, number> = { ArrowUp: blank + N, ArrowDown: blank - N, ArrowLeft: blank + 1, ArrowRight: blank - 1 };
      const target = map[e.key];
      if (target === undefined) return;
      e.preventDefault();
      if (neighbours(blank).includes(target)) tap(target);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, tiles, tap]);

  return (
    <div className="mx-auto max-w-md px-4 py-10 text-center sm:px-6">
      <div className="flex items-center justify-between gap-3 text-left">
        <Link href="/games" className="text-sm font-semibold text-beam hover:underline">← Games</Link>
        <CoinBadge />
      </div>
      <h1 className="mt-2 font-display text-3xl font-extrabold">Slide 15</h1>
      <p className="mt-2 text-muted">
        Put the tiles back in order, 1 to 15. Tap a tile in the gap&apos;s row or column to slide it (or use the arrow keys).
        Fewer moves, more coins.
      </p>

      <p className="mt-4 text-sm font-semibold text-muted">Moves: {moves}</p>

      <div className="relative mx-auto mt-3 w-full max-w-[20rem]">
        <div className="grid aspect-square grid-cols-4 gap-2 rounded-2xl border-2 border-ink bg-fog p-2 shadow-block">
          {tiles.map((v, i) =>
            v === 0 ? (
              <div key={i} aria-hidden="true" />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => tap(i)}
                disabled={state !== "playing"}
                aria-label={`Tile ${v}`}
                className="flex items-center justify-center rounded-xl border-2 border-ink font-display text-2xl font-extrabold text-ink transition-transform active:scale-95 disabled:cursor-default"
                style={{ backgroundColor: COLORS[Math.floor((v - 1) / N)] }}
              >
                {v}
              </button>
            ),
          )}
        </div>

        {state !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-paper/85">
            {state === "won" && (
              <p className="font-display text-xl font-bold">
                Solved in {moves} moves: +{earned} coins
              </p>
            )}
            <button
              type="button"
              onClick={start}
              className="rounded-full bg-beam px-6 py-3 font-bold text-white hover:bg-beamDeep"
            >
              {state === "won" ? "Play again" : "Shuffle & start"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
