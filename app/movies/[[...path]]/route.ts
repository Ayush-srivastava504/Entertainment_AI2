import { gone } from "@/lib/legacy";

// The movie catalog was removed: every old /movies/* URL is gone for good.
export async function GET() {
  return gone();
}
export const HEAD = GET;
