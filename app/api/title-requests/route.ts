import { NextRequest, NextResponse } from "next/server";
import { addTitleRequest } from "@/lib/db";

export const runtime = "nodejs";

const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const attempts = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  attempts.push(now);
  hits.set(key, attempts);
  if (hits.size > 1000) {
    for (const [ip, timestamps] of hits) {
      if (!timestamps.some((time) => now - time < WINDOW_MS)) hits.delete(ip);
    }
  }
  return attempts.length > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null || !("title" in payload)) {
    return NextResponse.json({ error: "Enter a title up to 120 characters." }, { status: 400 });
  }
  const titleValue = (payload as { title?: unknown }).title;
  const title = typeof titleValue === "string" ? titleValue.trim() : "";
  if (!title || title.length > 120) {
    return NextResponse.json({ error: "Enter a title up to 120 characters." }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Please try again in a minute." }, { status: 429 });
  }

  try {
    await addTitleRequest(title);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("title request insert error:", err);
    return NextResponse.json({ error: "Could not send your request. Please try again shortly." }, { status: 502 });
  }
}