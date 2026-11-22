import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/site";
import { socialMeta } from "@/lib/og";
import { INDEX_ROBOTS } from "@/lib/seo";
import CharactersHub, { CHARACTERS_DESCRIPTION, CHARACTERS_TITLE } from "@/components/hubs/CharactersHub";

// Static, rebuilt hourly. Search results (/anime-characters?q=) are served by
// app/anime-characters/search via a middleware rewrite; old ?page= browse
// URLs are redirected by middleware.ts. So this page never reads searchParams.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: CHARACTERS_TITLE },
  description: CHARACTERS_DESCRIPTION,
  alternates: { canonical: `${getBaseUrl()}/anime-characters` },
  ...socialMeta({ title: CHARACTERS_TITLE, description: CHARACTERS_DESCRIPTION, path: "/anime-characters", cardTitle: "Anime Characters", cardSubtitle: "Profiles, voice actors and the most loved characters", badge: "CHARACTERS" }),
  robots: INDEX_ROBOTS,
};

export default function CharactersPage() {
  return <CharactersHub />;
}
