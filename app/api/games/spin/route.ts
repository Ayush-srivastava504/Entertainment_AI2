import { NextResponse } from "next/server";
import { getAllAvatars } from "@/lib/games/avatars";
import { BONUS_CHANCE, BONUS_COINS } from "@/lib/games/spin";

export const dynamic = "force-dynamic";

// The wallet and the collection live in the player's browser, so the client
// tells us which avatars it already owns and we prefer one it does not.
export async function POST(req: Request) {
  try {
    if (Math.random() < BONUS_CHANCE) {
      return NextResponse.json({ type: "coins" as const, amount: BONUS_COINS });
    }

    let owned: string[] = [];
    try {
      const body = await req.json();
      if (Array.isArray(body?.owned)) owned = body.owned.filter((x: unknown) => typeof x === "string").slice(0, 2000);
    } catch {
      /* no body: treat as an empty collection */
    }

    const all = await getAllAvatars();
    if (!all.length) return NextResponse.json({ type: "coins" as const, amount: BONUS_COINS });

    const have = new Set(owned);
    const fresh = all.filter((a) => !have.has(a.id));
    const pool = fresh.length ? fresh : all;
    const avatar = pool[Math.floor(Math.random() * pool.length)];
    return NextResponse.json({ type: "avatar" as const, avatar, duplicate: have.has(avatar.id) });
  } catch (err) {
    console.error("[games/spin] failed:", err);
    return NextResponse.json({ error: "spin failed" }, { status: 500 });
  }
}
