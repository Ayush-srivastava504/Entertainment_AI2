/*
Shared search logic for app/search/page.tsx (server-rendered results) and
app/api/search/route.ts (JSON endpoint for any future client-side use).
Searches across the three things this site actually has: published movie
guides, published anime guides, and published franchise (Watch Order)
guides. Kept in one place so the page and the API route can never drift.
*/

import { searchPublishedMovies } from "@/lib/api/movies";
import { searchPublishedAnime } from "@/lib/api/anime";
import { searchPublishedFranchises, type Franchise } from "@/lib/api/franchises";
import type { MediaItem } from "@/lib/api/normalize";

export interface SiteSearchResults {
  movies: MediaItem[];
  anime: MediaItem[];
  franchises: Franchise[];
}

export async function searchSite(query: string, limit = 12): Promise<SiteSearchResults> {
  const trimmed = query.trim();
  if (!trimmed) return { movies: [], anime: [], franchises: [] };

  const [movies, anime, franchises] = await Promise.all([
    searchPublishedMovies(trimmed, limit),
    searchPublishedAnime(trimmed, limit),
    searchPublishedFranchises(trimmed, limit),
  ]);

  return { movies, anime, franchises };
}
