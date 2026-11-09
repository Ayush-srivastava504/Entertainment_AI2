"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { addCoins } from "@/lib/games/wallet";
import { getGeneratedAvatars, pickRandom, type Avatar } from "@/lib/games/avatars";
import CoinBadge from "@/components/games/CoinBadge";

const COLS = 10;
const ROWS = 20;
const COLORS = ["#4C61C9", "#5EC8FF", "#FF5C5C", "#FFD36E", "#6EE7B7", "#C98BFF", "#FF9ECF"];
const TYPES = ["I", "O", "T", "S", "Z", "J", "L"] as const;
type PieceType = (typeof TYPES)[number];

// Twist: every 4 lines cleared pops one of the site's avatars onto the
// board for a coin bonus -- the one deliberate departure from plain Tetris.
const LINES_PER_GACHA = 4;
const GACHA_BONUS = 50;
const LINE_COINS = [0, 10, 25, 40, 60]; // indexed by lines cleared in one drop

const SHAPES: Record<PieceType, number[][][]> = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  O: [
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
};

function typeColor(t: PieceType) {
  return COLORS[TYPES.indexOf(t)];
}

type Cell = string | null; // color or empty
type Piece = { type: PieceType; rotation: number; x: number; y: number };

function emptyBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

function randomType(): PieceType {
  return TYPES[Math.floor(Math.random() * TYPES.length)];
}

function cells(piece: Piece): [number, number][] {
  return SHAPES[piece.type][piece.rotation].map(([cx, cy]) => [piece.x + cx, piece.y + cy]);
}

function collides(board: Cell[][], piece: Piece): boolean {
  return cells(piece).some(([x, y]) => {
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y < 0) return false;
    return board[y][x] !== null;
  });
}

interface GameState {
  board: Cell[][];
  piece: Piece;
  next: PieceType;
  lines: number;
  score: number;
  over: boolean;
}

function spawn(type: PieceType): Piece {
  return { type, rotation: 0, x: 3, y: -1 };
}

function freshGame(): GameState {
  return {
    board: emptyBoard(),
    piece: spawn(randomType()),
    next: randomType(),
    lines: 0,
    score: 0,
    over: false,
  };
}

export default function TetrisPage() {
  const [, setRenderTick] = useState(0);
  const gameRef = useRef<GameState>(freshGame());
  const runningRef = useRef(true);
  const [gacha, setGacha] = useState<Avatar | null>(null);
  const bump = useCallback(() => setRenderTick((t) => t + 1), []);

  const lockPiece = useCallback(() => {
    const g = gameRef.current;
    const color = typeColor(g.piece.type);
    for (const [x, y] of cells(g.piece)) {
      if (y >= 0) g.board[y][x] = color;
    }

    let cleared = 0;
    g.board = g.board.filter((row) => {
      const full = row.every((c) => c !== null);
      if (full) cleared++;
      return !full;
    });
    while (g.board.length < ROWS) g.board.unshift(Array<Cell>(COLS).fill(null));

    if (cleared > 0) {
      g.score += LINE_COINS[cleared] ?? cleared * 15;
      const before = Math.floor(g.lines / LINES_PER_GACHA);
      g.lines += cleared;
      const after = Math.floor(g.lines / LINES_PER_GACHA);
      addCoins(LINE_COINS[cleared] ?? cleared * 15);
      if (after > before) {
        g.score += GACHA_BONUS;
        addCoins(GACHA_BONUS);
        const [a] = pickRandom(getGeneratedAvatars(), 1);
        setGacha(a);
        setTimeout(() => setGacha(null), 1800);
      }
    }

    const nextPiece = spawn(g.next);
    g.next = randomType();
    if (collides(g.board, nextPiece)) {
      g.over = true;
      runningRef.current = false;
    }
    g.piece = nextPiece;
    bump();
  }, [bump]);

  const step = useCallback(() => {
    const g = gameRef.current;
    if (g.over) return;
    const moved = { ...g.piece, y: g.piece.y + 1 };
    if (collides(g.board, moved)) {
      lockPiece();
    } else {
      g.piece = moved;
      bump();
    }
  }, [bump, lockPiece]);

  useEffect(() => {
    const id = setInterval(() => {
      if (runningRef.current && !gameRef.current.over) step();
    }, 650);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const g = gameRef.current;
      if (g.over) return;
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(e.key)) e.preventDefault();

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const dx = e.key === "ArrowLeft" ? -1 : 1;
        const moved = { ...g.piece, x: g.piece.x + dx };
        if (!collides(g.board, moved)) {
          g.piece = moved;
          bump();
        }
      } else if (e.key === "ArrowDown") {
        step();
      } else if (e.key === "ArrowUp") {
        const rotated = { ...g.piece, rotation: (g.piece.rotation + 1) % 4 };
        if (!collides(g.board, rotated)) {
          g.piece = rotated;
          bump();
        }
      } else if (e.key === " ") {
        let moved = { ...g.piece };
        while (!collides(g.board, { ...moved, y: moved.y + 1 })) moved = { ...moved, y: moved.y + 1 };
        g.piece = moved;
        lockPiece();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bump, step, lockPiece]);

  function restart() {
    gameRef.current = freshGame();
    runningRef.current = true;
    setGacha(null);
    bump();
  }

  const g = gameRef.current;
  const display = g.board.map((row) => [...row]);
  for (const [x, y] of cells(g.piece)) {
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) display[y][x] = typeColor(g.piece.type);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/games" className="text-sm font-semibold text-beam hover:underline">
            ← Games
          </Link>
          <h1 className="mt-1 font-display text-3xl font-extrabold">Chibi Blocks</h1>
          <p className="mt-1 text-sm text-muted">
            Arrow keys to move/rotate, Space to drop. Clear {LINES_PER_GACHA} lines total for a gacha coin bonus.
          </p>
        </div>
        <CoinBadge />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted">
        <span>Lines: {g.lines}</span>
        <span>Coins this game: {g.score}</span>
      </div>

      <div className="relative mt-5 inline-block">
        <div
          className="grid gap-px rounded-2xl border-2 border-ink bg-fog p-2 shadow-block"
          style={{ gridTemplateColumns: `repeat(${COLS}, 24px)`, gridTemplateRows: `repeat(${ROWS}, 24px)` }}
        >
          {display.flatMap((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                className="rounded-[3px]"
                style={{ backgroundColor: cell ?? "#0E1220" }}
              />
            ))
          )}
        </div>

        {gacha && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-paper/80 backdrop-blur-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gacha.thumb} alt={gacha.title} className="h-20 w-20 rounded-xl border-2 border-tape" />
            <p className="font-display font-bold text-tape">+{GACHA_BONUS} bonus coins!</p>
          </div>
        )}

        {g.over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-paper/90">
            <p className="font-display text-xl font-bold">Game over -- {g.score} coins earned</p>
            <button
              type="button"
              onClick={restart}
              className="rounded-full bg-beam px-5 py-2.5 text-sm font-bold text-white hover:bg-beamDeep"
            >
              Play again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
