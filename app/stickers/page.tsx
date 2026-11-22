import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/site";
import { socialMeta } from "@/lib/og";
import { INDEX_ROBOTS } from "@/lib/seo";
import StickersHub, { STICKERS_DESCRIPTION, STICKERS_PATH, STICKERS_TITLE } from "@/components/hubs/StickersHub";

// Static, rebuilt hourly. Search results (/stickers?q=) are served by
// app/stickers/search via a middleware rewrite, so this page never reads
// searchParams and can be cached.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: STICKERS_TITLE },
  description: STICKERS_DESCRIPTION,
  alternates: { canonical: `${getBaseUrl()}${STICKERS_PATH}` },
  ...socialMeta({ title: STICKERS_TITLE, description: STICKERS_DESCRIPTION, path: STICKERS_PATH, cardTitle: "Anime Girl Stickers & GIFs", cardSubtitle: "Free to download and send", badge: "STICKERS" }),
  robots: INDEX_ROBOTS,
};

export default function StickersPage() {
  return <StickersHub />;
}
