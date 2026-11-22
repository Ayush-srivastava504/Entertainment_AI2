import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getBaseUrl } from "@/lib/site";
import { NOINDEX_ROBOTS } from "@/lib/seo";
import StickersHub, { STICKERS_DESCRIPTION, STICKERS_PATH, STICKERS_TITLE } from "@/components/hubs/StickersHub";

/*
Search results for /stickers?q=... The public URL stays /stickers?q=...
(middleware.ts rewrites it here), so links and bookmarks are unchanged.
Search results are any string, often empty: noindex, canonical to the hub,
and ?q= is disallowed in robots.txt.
*/
type SP = Promise<{ q?: string | string[] }>;

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: STICKERS_TITLE },
    description: STICKERS_DESCRIPTION,
    alternates: { canonical: `${getBaseUrl()}${STICKERS_PATH}` },
    robots: NOINDEX_ROBOTS,
  };
}

export default async function StickerSearchPage({ searchParams }: { searchParams: SP }) {
  const q = first((await searchParams).q);
  if (!q) redirect(STICKERS_PATH);
  return <StickersHub query={q} />;
}
