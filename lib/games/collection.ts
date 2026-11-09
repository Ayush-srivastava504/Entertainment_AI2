"use client";

/*
Collectible avatar inventory. Same pattern as the coin wallet: no accounts,
just this browser's localStorage. The spinner awards avatars; the Games hub
shows which ones you own and lets you download them.
*/

const KEY = "animegirl4u:avatars-owned";
export const COLLECTION_CHANGED_EVENT = "animegirl4u:collection-changed";

export function getOwnedAvatarIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Returns true when the avatar was new to the collection. */
export function addOwnedAvatar(id: string): boolean {
  const owned = getOwnedAvatarIds();
  if (owned.includes(id)) return false;
  const next = [...owned, id];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(COLLECTION_CHANGED_EVENT, { detail: { owned: next } }));
  } catch {
    /* storage blocked: the win still shows, it just isn't remembered */
  }
  return true;
}

/** Saves an avatar image to the device. Fetches it first so the download also
 * works for cross-origin images (the `download` attribute is ignored there). */
export async function downloadAvatar(url: string, name: string): Promise<void> {
  const ext = (url.split("?")[0].match(/\.(svg|png|jpe?g|webp|gif)$/i)?.[1] || "png").toLowerCase();
  const fileName = `${name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "avatar"}.${ext}`;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}
