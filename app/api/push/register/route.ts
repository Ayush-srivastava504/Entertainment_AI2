import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

/*
Stores an FCM device token so a future campaign (new blog post, etc.) can send
push to it. Called from components/AppBridge.tsx whenever the Android app
successfully registers for push (on every cold start with permission already
granted, not just the first time) — the upsert below keeps last_seen_at fresh
and is a no-op in cost for repeat calls.

Uses getPool() directly (this project's actual Postgres helper, see lib/db.ts)
rather than a query() wrapper that doesn't exist in this codebase.

Requires the device_tokens table — see db/schema.sql.
*/

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { token, platform } = (body as { token?: unknown; platform?: unknown }) || {};
  if (typeof token !== "string" || token.length < 10 || token.length > 4096) {
    return NextResponse.json({ error: "Missing or invalid token" }, { status: 400 });
  }
  const safePlatform = typeof platform === "string" && platform.length <= 32 ? platform : "android";

  try {
    const pool = getPool();
    await pool.query(
      `insert into device_tokens (token, platform, created_at, last_seen_at)
       values ($1, $2, now(), now())
       on conflict (token) do update set last_seen_at = now(), platform = excluded.platform`,
      [token, safePlatform]
    );
    // Opportunistic cleanup: tokens unseen for 90 days belong to uninstalled apps.
    await pool.query("delete from device_tokens where last_seen_at < now() - interval '90 days'");
  } catch (err) {
    console.error("push/register: failed to store token", err);
    return NextResponse.json({ error: "Could not store token" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
