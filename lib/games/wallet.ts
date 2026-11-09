"use client";

/*
Coin wallet for the Games section. Same pattern as lib/favorites.ts: no
accounts, no server, just this browser's localStorage. Coins have no real
money value -- they only exist to be earned in the mini-games and spent on
the sticker/GIF spinner.
*/

const KEY = "animegirl4u:coins";
export const COINS_CHANGED_EVENT = "animegirl4u:coins-changed";

function readBalance(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeBalance(n: number) {
  const safe = Math.max(0, Math.round(n));
  window.localStorage.setItem(KEY, String(safe));
  window.dispatchEvent(new CustomEvent(COINS_CHANGED_EVENT, { detail: { balance: safe } }));
}

export function getCoins(): number {
  return readBalance();
}

/** Add coins earned from playing a game. Returns the new balance. */
export function addCoins(amount: number): number {
  if (amount <= 0) return readBalance();
  const next = readBalance() + amount;
  writeBalance(next);
  return next;
}

/** Try to spend coins (e.g. a spin). Returns false (and changes nothing) if
 * the balance is too low. */
export function spendCoins(amount: number): boolean {
  const current = readBalance();
  if (amount <= 0 || current < amount) return false;
  writeBalance(current - amount);
  return true;
}
