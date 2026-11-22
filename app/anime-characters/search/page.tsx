import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getBaseUrl } from "@/lib/site";
import { NOINDEX_ROBOTS } from "@/lib/seo";
import CharactersHub, { CHARACTERS_DESCRIPTION, CHARACTERS_TITLE } from "@/components/hubs/CharactersHub";

/*
Live MyAnimeList search results for /anime-characters?q=... The public URL
is unchanged (middleware.ts rewrites it here). Noindex, canonical to the hub,
and ?q= is disallowed in robots.txt; the result cards link to live fallback
profiles that are noindex too.
*/
type SP = Promise<{ q?: string; page?: string }>;

export const metadata: Metadata = {
  title: { absolute: CHARACTERS_TITLE },
  description: CHARACTERS_DESCRIPTION,
  alternates: { canonical: `${getBaseUrl()}/anime-characters` },
  robots: NOINDEX_ROBOTS,
};

export default async function CharacterSearchPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  if (!q) redirect("/anime-characters");
  return <CharactersHub query={q} page={Number(sp.page) || 1} />;
}
