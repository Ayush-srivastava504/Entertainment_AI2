import { legacyTitle } from "@/lib/legacy";

export async function GET(_req: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  return legacyTitle("anime", (await params).path);
}
export const HEAD = GET;
