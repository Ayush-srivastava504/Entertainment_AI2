"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { addCoins } from "@/lib/games/wallet";
import CoinBadge from "@/components/games/CoinBadge";

// Four in a Row against the computer: drop discs, connect four to win.
const COLS = 7;
const ROWS = 6;
const WIN_COINS = 30;
const DRAW_COINS = 10;
type Disc = 0 | 1 | 2; // 0 empty, 1 you, 2 computer
type Board = Disc[][]; // [row][col], row 0 at the top

const empty = (): Board => Array.from({ length: ROWS }, () => Array<Disc>(COLS).fill(0));

function dropRow(b: Board, col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) if (b[r][col] === 0) return r;
  return -1;
}

function play(b: Board, col: number, who: Disc): Board | null {
  const r = dropRow(b, col);
  if (r < 0) return null;
  const next = b.map((row) => [...row]);
  next[r][col] = who;
  return next;
}

/** The four winning cells, or null. */
function winLine(b: Board, who: Disc): [number, number][] | null {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      for (const [dr, dc] of dirs) {
        const line: [number, number][] = [];
        for (let k = 0; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || b[rr][cc] !== who) break;
          line.push([rr, cc]);
        }
        if (line.length === 4) return line;
      }
  return null;
}

const full = (b: Board) => b[0].every((v) => v !== 0);
const open = (b: Board) => [...Array(COLS).keys()].filter((c) => b[0][c] === 0);

/** Simple but fair opponent: win if it can, block your win, never hand you a win on top, prefer the centre. */
function cpuMove(b: Board): number {
  const cols = open(b);
  for (const c of cols) if (winLine(play(b, c, 2)!, 2)) return c;
  for (const c of cols) if (winLine(play(b, c, 1)!, 1)) return c;
  const safe = cols.filter((c) => {
    const after = play(b, c, 2)!;
    return !open(after).some((c2) => winLine(play(after, c2, 1)!, 1));
  });
  const pool = safe.length ? safe : cols;
  const centre = (COLS - 1) / 2;
  const score = (c: number) => -Math.abs(c - centre) + Math.random() * 1.5;
  return [...pool].sort((x, y) => score(y) - score(x))[0];
}

export default function FourInARowPage() {
  const [board, setBoard] = useState<Board>(empty);
  const [turn, setTurn] = useState<"you" | "cpu" | "over">("you");
  const [result, setResult] = useState<"win" | "lose" | "draw" | null>(null);
  const [line, setLine] = useState<[number, number][]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function finish(r: "win" | "lose" | "draw", l: [number, number][] = []) {
    setResult(r);
    setLine(l);
    setTurn("over");
    if (r === "win") addCoins(WIN_COINS);
    if (r === "draw") addCoins(DRAW_COINS);
  }

  function drop(col: number) {
    if (turn !== "you") return;
    const b = play(board, col, 1);
    if (!b) return;
    setBoard(b);
    const w = winLine(b, 1);
    if (w) return finish("win", w);
    if (full(b)) return finish("draw");
    setTurn("cpu");
    timer.current = setTimeout(() => {
      const b2 = play(b, cpuMove(b), 2)!;
      setBoard(b2);
      const w2 = winLine(b2, 2);
      if (w2) return finish("lose", w2);
      if (full(b2)) return finish("draw");
      setTurn("you");
    }, 450);
  }

  function restart() {
    if (timer.current) clearTimeout(timer.current);
    setBoard(empty());
    setTurn("you");
    setResult(null);
    setLine([]);
  }

  const inLine = (r: number, c: number) => line.some(([lr, lc]) => lr === r && lc === c);
  const status =
    result === "win" ? `You win! +${WIN_COINS} coins`
    : result === "lose" ? "The computer wins this one."
    : result === "draw" ? `Draw: +${DRAW_COINS} coins`
    : turn === "cpu" ? "Computer is thinking…"
    : "Your turn: tap a column";

  return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center sm:px-6">
      <div className="flex items-center justify-between gap-3 text-left">
        <Link href="/games" className="text-sm font-semibold text-beam hover:underline">← Games</Link>
        <CoinBadge />
      </div>
      <h1 className="mt-2 font-display text-3xl font-extrabold">Four in a Row</h1>
      <p className="mt-2 text-muted">
        Drop pink discs and connect four across, down or diagonally before the computer does. Win {WIN_COINS} coins, draw {DRAW_COINS}.
      </p>

      <p className="mt-4 font-display text-lg font-bold" aria-live="polite">{status}</p>

      <div
        className="mx-auto mt-3 grid w-full max-w-[26rem] gap-1.5 rounded-2xl border-2 border-ink bg-beam p-2 shadow-block"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      >
        {[...Array(COLS).keys()].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => drop(c)}
            disabled={turn !== "you" || board[0][c] !== 0}
            aria-label={`Drop in column ${c + 1}`}
            className="group flex flex-col gap-1.5 rounded-lg focus-visible:outline-none disabled:cursor-default"
          >
            {board.map((row, r) => (
              <span
                key={r}
                className={`block aspect-square w-full rounded-full border-2 transition-colors ${
                  inLine(r, c) ? "border-white ring-2 ring-white" : "border-ink/40"
                } ${row[c] === 1 ? "bg-[#FF8FB8]" : row[c] === 2 ? "bg-[#FFD36E]" : "bg-paper group-hover:group-enabled:bg-fog"}`}
              />
            ))}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#FF8FB8]" /> You</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#FFD36E]" /> Computer</span>
      </div>

      <button
        type="button"
        onClick={restart}
        className="mt-5 rounded-full bg-beam px-6 py-3 font-bold text-white hover:bg-beamDeep"
      >
        {turn === "over" ? "Play again" : "Restart"}
      </button>
    </div>
  );
}
