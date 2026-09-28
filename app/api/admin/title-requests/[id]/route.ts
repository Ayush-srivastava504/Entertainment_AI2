import { NextRequest, NextResponse } from "next/server";
import { deleteAdminTitleRequest } from "@/lib/admin-db";

export const runtime = "nodejs";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteAdminTitleRequest(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("admin title request delete error:", err);
    return NextResponse.json({ error: "Could not remove title request." }, { status: 502 });
  }
}