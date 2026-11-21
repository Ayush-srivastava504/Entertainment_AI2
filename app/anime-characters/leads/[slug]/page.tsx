import { notFound, permanentRedirect } from "next/navigation";
import { getDbSlugsByIds } from "@/lib/characters-db";
import { getLeadBySlug, getTrendingLeads } from "@/lib/characters";

/*
/anime-characters/leads/<slug> only forwards to the character's profile.
A lead with a public profile redirects to it (one URL per character). A lead
without one would be a thin duplicate page, so it is a 404 until the profile
has a bio (see isPublicCharacter). The query is strict: a DB error throws
(the request is retried and ISR keeps the last good result) instead of
turning every lead into a 404.
*/

type Params = { slug: string };

export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams(): Params[] {
  return getTrendingLeads().items.map((l) => ({ slug: l.character.slug }));
}

async function resolve(slug: string): Promise<never> {
  const lead = getLeadBySlug(slug);
  if (!lead) notFound();
  const profileSlug = (await getDbSlugsByIds([lead.character.id], { strict: true })).get(lead.character.id);
  if (profileSlug) permanentRedirect(`/anime-characters/${profileSlug}`);
  notFound();
}

// Metadata is blocking for search bots, so they get the real 308/404 here.
export async function generateMetadata({ params }: { params: Promise<Params> }) {
  return resolve((await params).slug);
}

export default async function LeadPage({ params }: { params: Promise<Params> }) {
  return resolve((await params).slug);
}
