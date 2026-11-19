"use client";

export interface FavoriteItem {
  id: string; // stable key, e.g. "anime:toradora"
  type: "anime";
  title: string;
  note?: string;
  savedAt: string; // ISO
}

const KEY = "animegirl4u:favorites";

function readAll(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    // Movie guides were removed; drop any movie favorites saved before that.
    const items = raw ? (JSON.parse(raw) as { type?: string }[]) : [];
    return items.filter((f) => f?.type === "anime") as FavoriteItem[];
  } catch {
    return [];
  }
}

function writeAll(items: FavoriteItem[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  // Let other components on the page (e.g. a header counter) react without
  // a shared state library.
  window.dispatchEvent(new CustomEvent("animegirl4u:favorites-changed"));
}

export function getFavorites(): FavoriteItem[] {
  return readAll().sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

export function isFavorite(id: string): boolean {
  return readAll().some((f) => f.id === id);
}

export function addFavorite(item: Omit<FavoriteItem, "savedAt">): void {
  const all = readAll();
  if (all.some((f) => f.id === item.id)) return;
  writeAll([...all, { ...item, savedAt: new Date().toISOString() }]);
}

export function removeFavorite(id: string): void {
  writeAll(readAll().filter((f) => f.id !== id));
}

export function toggleFavorite(item: Omit<FavoriteItem, "savedAt">): boolean {
  if (isFavorite(item.id)) {
    removeFavorite(item.id);
    return false;
  }
  addFavorite(item);
  return true;
}
