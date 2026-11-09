"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getGeneratedAvatars, pickRandom, type Avatar } from "@/lib/games/avatars";
import { addCoins } from "@/lib/games/wallet";
import CoinBadge from "@/components/games/CoinBadge";

const PAIRS = 8; // 16 cards
const COINS_PER_MATCH = 8;
const PERFECT_BONUS = 40; // awarded if you finish with no mismatches at all

type Card = { key: string; avatar: Avatar; matched: boolean };

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function newDeck(): Card[] {
  const avatars = pickRandom(getGeneratedAvatars(), PAIRS);
  const deck = shuffle(
    avatars.flatMap((a) => [
      { key: `${a.id}-a`, avatar: a, matched: false },
      { key: `${a.id}-b`, avatar: a, matched: false },
    ])
  );
  return deck;
}

export default function MemoryGamePage() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [mismatches, setMismatches] = useState(0);
  const [won, setWon] = useState(false);
  const [earned, setEarned] = useState(0);

  useEffect(() => {
    setDeck(newDeck());
  }, []);

  const matchedCount = useMemo(() => deck.filter((c) => c.matched).length, [deck]);

  function startNewGame() {
    setDeck(newDeck());
    setOpen([]);
    setMoves(0);
    setMismatches(0);
    setWon(false);
    setEarned(0);
  }

  function flip(i: number) {
    if (won || open.length === 2 || open.includes(i) || deck[i].matched) return;
    const nextOpen = [...open, i];
    setOpen(nextOpen);

    if (nextOpen.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = nextOpen;
      if (deck[a].avatar.id === deck[b].avatar.id) {
        const coins = addCoins(COINS_PER_MATCH);
        setEarned((e) => e + COINS_PER_MATCH);
        setDeck((d) => d.map((c, idx) => (idx === a || idx === b ? { ...c, matched: true } : c)));
        setOpen([]);
        void coins;
      } else {
        setMismatches((m) => m + 1);
        setTimeout(() => setOpen([]), 700);
      }
    }
  }

  useEffect(() => {
    if (deck.length && matchedCount === deck.length && !won) {
      setWon(true);
      if (mismatches === 0) {
        addCoins(PERFECT_BONUS);
        setEarned((e) => e + PERFECT_BONUS);
      }
    }
  }, [matchedCount, deck.length, won, mismatches]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/games" className="text-sm font-semibold text-beam hover:underline">
            ← Games
          </Link>
          <h1 className="mt-1 font-display text-3xl font-extrabold">Memory Match</h1>
        </div>
        <CoinBadge />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted">
        <span>Moves: {moves}</span>
        <span>Mismatches: {mismatches}</span>
        <span>Pairs found: {matchedCount / 2} / {PAIRS}</span>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2.5 sm:gap-3">
        {deck.map((card, i) => {
          const revealed = card.matched || open.includes(i);
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => flip(i)}
              aria-label={revealed ? card.avatar.title : "Hidden card"}
              className={`aspect-square overflow-hidden rounded-xl border-2 border-ink shadow-blockSm transition-transform ${
                card.matched ? "opacity-60" : "hover:-translate-y-0.5"
              } ${revealed ? "bg-surface" : "bg-beam"}`}
            >
              {revealed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.avatar.thumb} alt={card.avatar.title} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl text-white">?</span>
              )}
            </button>
          );
        })}
      </div>

      {won && (
        <div className="mt-6 rounded-2xl border-2 border-ink bg-surface p-5 shadow-block">
          <p className="font-display text-xl font-bold">
            Solved in {moves} moves! +{earned} coins
            {mismatches === 0 ? " (perfect run bonus included)" : ""}
          </p>
          <button
            type="button"
            onClick={startNewGame}
            className="mt-3 rounded-full bg-beam px-5 py-2.5 text-sm font-bold text-white hover:bg-beamDeep"
          >
            Play again
          </button>
        </div>
      )}

      {!won && (
        <button
          type="button"
          onClick={startNewGame}
          className="mt-6 rounded-full border-2 border-ink px-5 py-2.5 text-sm font-bold text-ink hover:bg-tape"
        >
          Shuffle / restart
        </button>
      )}
    </div>
  );
}
