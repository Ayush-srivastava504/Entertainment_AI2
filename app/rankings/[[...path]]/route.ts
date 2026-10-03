import { gone } from "@/lib/legacy";

export async function GET() {
  return gone();
}
export const HEAD = GET;
