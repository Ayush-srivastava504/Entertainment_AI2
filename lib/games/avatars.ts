import manifest from "./avatars-manifest.json";
import { listUserAvatars } from "./user-avatars";

export interface Avatar {
  id: string;
  title: string;
  image: string;
  thumb: string;
  source?: "generated" | "user";
}

const GENERATED: Avatar[] = (manifest as Omit<Avatar, "source">[]).map((a) => ({
  ...a,
  source: "generated",
}));

/** The 100 generated avatars plus anything you've uploaded to the
 * game-avatars Supabase bucket (see lib/games/user-avatars.ts). */
export async function getAllAvatars(): Promise<Avatar[]> {
  const extra = await listUserAvatars();
  return [...GENERATED, ...extra];
}

export function getGeneratedAvatars(): Avatar[] {
  return GENERATED;
}

export function getAvatarById(id: string): Avatar | undefined {
  return GENERATED.find((a) => a.id === id);
}

export function pickRandom<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}
