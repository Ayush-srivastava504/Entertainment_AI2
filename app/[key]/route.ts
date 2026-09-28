import { NextResponse } from "next/server";

// Serves the IndexNow key-verification file at /<INDEXNOW_KEY>.txt.
// Literal top-level routes (about, search, admin, ...) always win over this
// dynamic segment, and it only answers when the requested filename is
// exactly the configured key, so it can't shadow anything else.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const indexNowKey = process.env.INDEXNOW_KEY;

  if (!indexNowKey || key !== `${indexNowKey}.txt`) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(indexNowKey, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
