import type { Metadata } from "next";
import { buildOgImageUrl } from "@/lib/og";
import { SITE_NAME } from "@/lib/site";

// Applies to every /games/* route, including the client-rendered game
// pages (which can't export their own metadata). Keeps the whole section
// out of search results for now -- same call as leaving it off the
// sitemap: no reason for a brand-new games section to compete for crawl
// budget before the main content has earned trust.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
  // Share card for the individual games (client pages can't export metadata).
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `Anime Mini-Games | ${SITE_NAME}`,
    description: "Free anime mini-games: play, earn coins and collect avatars.",
    images: [{ url: buildOgImageUrl({ title: "Anime Mini-Games", subtitle: "Play, earn coins and collect avatars", badge: "GAMES" }), width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
