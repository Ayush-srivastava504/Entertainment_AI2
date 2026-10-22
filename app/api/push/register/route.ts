import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/*
Stores an FCM device token so a future campaign (new blog post, etc.) can send
push to it. Called from components/AppBridge.tsx whenever the Android app
successfully registers for push (on every cold start with permission already
granted, not just the first time) — the upsert below keeps last_seen_at fresh
and is a no-op in cost for repeat calls.

NOTE: this assumes a `query(sql, params)` helper exported from "@/lib/db" that
runs against the project's existing Postgres pool, matching the pattern used
elsewhere in the codebase (crawlers, lib/api/*). If the project's actual
helper has a different name/shape, update the import and the call below —
nothing else in this route is Postgres-specific beyond that one call.

Requires the table added in the Session 3 handoff's schema.sql snippet:
device_tokens (token text primary key, platform text, created_at, last_seen_at).
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
    await query(
      `insert into device_tokens (token, platform, created_at, last_seen_at)
       values ($1, $2, now(), now())
       on conflict (token) do update set last_seen_at = now(), platform = excluded.platform`,
      [token, safePlatform]
    );
  } catch (err) {
    console.error("push/register: failed to store token", err);
    return NextResponse.json({ error: "Could not store token" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
