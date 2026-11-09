import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

// Removes an FCM token (used by the "delete my data" page inside the app).
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { token } = (body as { token?: unknown }) || {};
  if (typeof token !== "string" || token.length < 10 || token.length > 4096) {
    return NextResponse.json({ error: "Missing or invalid token" }, { status: 400 });
  }
  try {
    await getPool().query("delete from device_tokens where token = $1", [token]);
  } catch (err) {
    console.error("push/unregister failed", err);
    return NextResponse.json({ error: "Could not remove token" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
