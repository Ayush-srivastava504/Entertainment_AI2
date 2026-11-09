"use client";

import { useState } from "react";
import Link from "next/link";
import { addCoins } from "@/lib/games/wallet";
import CoinBadge from "@/components/games/CoinBadge";

type Cell = "X" | "O" | null;
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];
const WIN_COINS = 25;
const DRAW_COINS = 8;

function winner(b: Cell[]): Cell {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  return null;
}

// Minimax: the computer (O) plays well but not perfectly, so you can still win.
function score(b: Cell[], turn: "X" | "O", depth: number): number {
  const w = winner(b);
  if (w === "O") return 10 - depth;
  if (w === "X") return depth - 10;
  if (b.every(Boolean)) return 0;
  const scores: number[] = [];
  b.forEach((c, i) => {
    if (c) return;
    const n = [...b];
    n[i] = turn;
    scores.push(score(n, turn === "O" ? "X" : "O", depth + 1));
  });
  return turn === "O" ? Math.max(...scores) : Math.min(...scores);
}

function computerMove(b: Cell[]): number {
  const empty = b.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
  // 25% of the time make a random move so the game is beatable.
  if (Math.random() < 0.25) return empty[Math.floor(Math.random() * empty.length)];
  let best = empty[0];
  let bestScore = -Infinity;
  for (const i of empty) {
    const n = [...b];
    n[i] = "O";
    const s = score(n, "X", 1);
    if (s > bestScore) {
      bestScore = s;
      best = i;
    }
  }
  return best;
}

export default function TicTacToePage() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [earned, setEarned] = useState<number | null>(null);

  const w = winner(board);
  const full = board.every(Boolean);
  const over = !!w || full;

  function finish(b: Cell[]) {
    const win = winner(b);
    if (win === "X") {
      addCoins(WIN_COINS);
      setEarned(WIN_COINS);
    } else if (b.every(Boolean) && !win) {
      addCoins(DRAW_COINS);
      setEarned(DRAW_COINS);
    } else if (win === "O") {
      setEarned(0);
    }
  }

  function play(i: number) {
    if (board[i] || over) return;
    const next = [...board];
    next[i] = "X";
    if (winner(next) || next.every(Boolean)) {
      setBoard(next);
      finish(next);
      return;
    }
    next[computerMove(next)] = "O";
    setBoard(next);
    finish(next);
  }

  function reset() {
    setBoard(Array(9).fill(null));
    setEarned(null);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 text-center sm:px-6">
      <div className="flex items-center justify-between gap-3 text-left">
        <Link href="/games" className="text-sm font-semibold text-beam hover:underline">← Games</Link>
        <CoinBadge />
      </div>
      <h1 className="mt-2 font-display text-3xl font-extrabold">Tic-Tac-Toe</h1>
      <p className="mt-2 text-muted">You are X. Win for {WIN_COINS} coins, draw for {DRAW_COINS}.</p>

      <div className="mx-auto mt-6 grid w-72 grid-cols-3 gap-2" role="grid" aria-label="Tic-Tac-Toe board">
        {board.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => play(i)}
            disabled={!!c || over}
            aria-label={`Cell ${i + 1}${c ? `, ${c}` : ""}`}
            className="flex h-24 items-center justify-center rounded-xl border-2 border-ink bg-surface font-display text-4xl font-extrabold shadow-blockSm enabled:hover:bg-tape"
          >
            <span className={c === "X" ? "text-beam" : "text-cue"}>{c}</span>
          </button>
        ))}
      </div>

      {over && (
        <div className="mt-6" role="status">
          <p className="font-display text-xl font-bold">
            {w === "X" ? `You win! +${earned} coins` : w === "O" ? "The computer wins this one." : `Draw! +${earned} coins`}
          </p>
          <button type="button" onClick={reset} className="mt-3 rounded-full bg-beam px-6 py-2 text-sm font-bold text-white hover:bg-beamDeep">
            Play again
          </button>
        </div>
      )}
    </div>
  );
}
