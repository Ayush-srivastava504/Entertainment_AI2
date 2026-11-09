import type { Metadata } from "next";

// Applies to every /games/* route, including the client-rendered game
// pages (which can't export their own metadata). Keeps the whole section
// out of search results for now -- same call as leaving it off the
// sitemap: no reason for a brand-new games section to compete for crawl
// budget before the main content has earned trust.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
