import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getDbSlugsByIds } from "@/lib/characters-db";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { socialMeta } from "@/lib/og";
import { breadcrumbNode, graph, jsonLdString } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getLeadBySlug, getTrendingLeads } from "@/lib/characters";

const BASE_URL = getBaseUrl();

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getTrendingLeads().items.map((l) => ({ slug: l.character.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const lead = getLeadBySlug(slug);
  if (!lead) return { title: { absolute: `Character not found | ${SITE_NAME}` }, robots: { index: false } };

  const { character: c, anime: a } = lead;
  const title = `${c.name} — Main Lead of ${a.title} | ${SITE_NAME}`;
  const description = (c.about ? c.about.replace(/\s+/g, " ").slice(0, 155) : `${c.name} is the female lead of ${a.title}: profile, voice actor and series info.`).trim();
  const url = `${BASE_URL}/anime-characters/leads/${c.slug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    ...socialMeta({
      title,
      description,
      path: `/anime-characters/leads/${c.slug}`,
      cardTitle: c.name,
      cardSubtitle: `Main lead of ${a.title}`,
      badge: "ANIME CHARACTER",
      poster: c.image ?? undefined,
      type: "profile",
    }),
  };
}

export default async function LeadPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const lead = getLeadBySlug(slug);
  if (!lead) notFound();

  // Every lead now has a full profile at /anime-characters/<slug> (Supabase-backed).
  // One URL per character avoids duplicate content; fall back to this simple
  // page only while the profile row is missing.
  const profileSlug = (await getDbSlugsByIds([lead.character.id])).get(lead.character.id);
  if (profileSlug) permanentRedirect(`/anime-characters/${profileSlug}`);

  const { character: c, anime: a } = lead;
  const leads = getTrendingLeads().items;
  const i = leads.indexOf(lead);
  const prev = i > 0 ? leads[i - 1] : null;
  const next = i < leads.length - 1 ? leads[i + 1] : null;
  const url = `${BASE_URL}/anime-characters/leads/${c.slug}`;

  const facts = [
    c.age ? ["Age", c.age] : null,
    c.birthday ? ["Birthday", c.birthday] : null,
    ["Gender", "Female"],
    ["Fan favourites", `♥ ${c.favourites.toLocaleString()}`],
  ].filter(Boolean) as [string, string][];

  const jsonLd = graph(
    {
      "@type": "ProfilePage",
      "@id": `${url}#webpage`,
      url,
      name: c.name,
      mainEntity: {
        "@type": "Person",
        name: c.name,
        alternateName: c.nameNative ?? undefined,
        gender: "Female",
        image: c.image ?? undefined,
      },
    },
    breadcrumbNode([
      { name: "Home", path: "/" },
      { name: "Characters", path: "/anime-characters" },
      { name: "Trending leads", path: "/anime-characters/leads" },
      { name: c.name, path: `/anime-characters/leads/${c.slug}` },
    ])
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />

      <div className="bg-gradient-to-b from-heroFrom to-heroTo">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Characters", href: "/anime-characters" },
              { name: "Trending leads", href: "/anime-characters/leads" },
              { name: c.name },
            ]}
          />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[260px_1fr]">
          <div>
            {c.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.image} alt={c.name} className="w-full rounded-2xl border-2 border-ink shadow-block" />
            )}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-beam">Main lead · Trending anime #{lead.rank}</p>
            <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{c.name}</h1>
            {c.nameNative && <p className="text-lg text-muted">{c.nameNative}</p>}
            {c.aliases.length > 0 && <p className="mt-2 text-sm text-muted">Also known as: {c.aliases.join(", ")}</p>}

            <dl className="mt-4 flex flex-wrap gap-2">
              {facts.map(([k, v]) => (
                <div key={k} className="rounded-full border-2 border-ink bg-surface px-3 py-1 text-sm">
                  <dt className="inline text-muted">{k}: </dt>
                  <dd className="inline font-semibold">{v}</dd>
                </div>
              ))}
            </dl>

            {c.about && (
              <section className="mt-6">
                <h2 className="font-display text-xl font-bold">About {c.name}</h2>
                <p className="mt-2 whitespace-pre-line leading-relaxed">{c.about}</p>
              </section>
            )}

            {c.voiceActors.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-xl font-bold">Voice actor</h2>
                <ul className="mt-3 flex flex-wrap gap-3">
                  {c.voiceActors.map((v) => (
                    <li key={v.name} className="flex items-center gap-2 rounded-full border-2 border-ink bg-surface py-1 pl-1 pr-4">
                      {v.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.image} alt={`${v.name}, voice actor`} loading="lazy" className="h-9 w-9 rounded-full object-cover" />
                      )}
                      <span className="text-sm font-semibold">{v.name}</span>
                      <span className="text-xs text-muted">Japanese</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        <section className="mt-10 flex gap-4 rounded-2xl border-2 border-ink bg-surface p-4 shadow-block">
          {a.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.image} alt={a.title} loading="lazy" className="h-40 w-28 shrink-0 rounded-lg border-2 border-ink object-cover" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Stars in</p>
            <h2 className="font-display text-xl font-bold">{a.title}</h2>
            <p className="text-sm text-muted">
              {[a.year, a.episodes ? `${a.episodes} eps` : null, a.score ? `★ ${a.score}` : null].filter(Boolean).join(" · ")}
            </p>
            {a.genres.length > 0 && <p className="mt-1 text-sm">{a.genres.join(" · ")}</p>}
            {a.synopsis && <p className="mt-2 text-sm leading-relaxed">{a.synopsis}</p>}
          </div>
        </section>

        <nav aria-label="More trending leads" className="mt-10 flex items-center justify-between gap-3">
          {prev ? (
            <Link href={`/anime-characters/leads/${prev.character.slug}`} className="inline-flex min-h-11 items-center rounded-full border-2 border-ink px-5 font-semibold hover:bg-tape">
              ← {prev.character.name}
            </Link>
          ) : (
            <span />
          )}
          <Link href="/anime-characters/leads" className="text-sm font-semibold underline">
            All {leads.length} leads
          </Link>
          {next ? (
            <Link href={`/anime-characters/leads/${next.character.slug}`} className="inline-flex min-h-11 items-center rounded-full border-2 border-ink px-5 font-semibold hover:bg-tape">
              {next.character.name} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </>
  );
}
