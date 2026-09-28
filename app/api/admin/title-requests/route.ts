import { NextResponse } from "next/server";
import { listAdminTitleRequests } from "@/lib/admin-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await listAdminTitleRequests();
    return NextResponse.json({ rows });
  } catch (err) {
    console.error("admin title request list error:", err);
    return NextResponse.json({ error: "Could not load title requests." }, { status: 502 });
  }
}