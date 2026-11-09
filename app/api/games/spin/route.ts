import { NextResponse } from "next/server";
import { searchGifs } from "@/lib/api/gifs";
import { SPIN_TAGS, BONUS_CHANCE, BONUS_COINS } from "@/lib/games/spin";

export async function POST() {
  try {
    if (Math.random() < BONUS_CHANCE) {
      return NextResponse.json({ type: "coins" as const, amount: BONUS_COINS });
    }

    const tag = SPIN_TAGS[Math.floor(Math.random() * SPIN_TAGS.length)];
    const results = await searchGifs(tag, 16);
    if (!results.length) {
      return NextResponse.json({ type: "coins" as const, amount: BONUS_COINS });
    }

    const item = results[Math.floor(Math.random() * results.length)];
    return NextResponse.json({ type: "gif" as const, tag, item });
  } catch (err) {
    console.error("[games/spin] failed:", err);
    return NextResponse.json({ error: "spin failed" }, { status: 500 });
  }
}
