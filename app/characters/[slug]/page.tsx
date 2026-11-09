import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { breadcrumbNode, graph, jsonLdString } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { characterSlug, getCharacter, parseCharacterId } from "@/lib/characters";

const BASE_URL = getBaseUrl();

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const id = parseCharacterId(slug);
  const c = id ? await getCharacter(id) : null;
  if (!c) return { title: { absolute: `Character not found | ${SITE_NAME}` }, robots: { index: false } };

  const title = `${c.name} — Anime Character Profile, Voice Actors & Anime | ${SITE_NAME}`;
  const description = (c.about ? c.about.replace(/\s+/g, " ").slice(0, 155) : `Profile of ${c.name}: appearances and voice actors.`).trim();
  const url = `${BASE_URL}/characters/${characterSlug(c)}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      url,
      siteName: SITE_NAME,
      title,
      description,
      images: c.image ? [{ url: c.image, alt: c.name }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CharacterPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const id = parseCharacterId(slug);
  if (!id) notFound();
  const c = await getCharacter(id);
  if (!c) notFound();

  const canonical = characterSlug(c);
  if (slug !== canonical) permanentRedirect(`/characters/${canonical}`);

  const jsonLd = graph(
    {
      "@type": "ProfilePage",
      "@id": `${BASE_URL}/characters/${canonical}#webpage`,
      url: `${BASE_URL}/characters/${canonical}`,
      name: c.name,
      mainEntity: { "@type": "Person", name: c.name, alternateName: c.nameKanji ?? undefined, image: c.image ?? undefined },
    },
    breadcrumbNode([
      { name: "Home", path: "/" },
      { name: "Characters", path: "/characters" },
      { name: c.name, path: `/characters/${canonical}` },
    ])
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />

      <div className="bg-gradient-to-b from-heroFrom to-heroTo">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Characters", href: "/characters" }, { name: c.name }]} />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[260px_1fr]">
          <div>
            {c.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.image} alt={c.name} className="w-full rounded-2xl border-2 border-ink shadow-block" />
            )}
            <p className="mt-3 text-muted">♥ {c.favorites.toLocaleString()} fans’ favorites</p>
          </div>

          <div>
            <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{c.name}</h1>
            {c.nameKanji && <p className="text-lg text-muted">{c.nameKanji}</p>}
            {c.nicknames.length > 0 && (
              <p className="mt-2 text-sm text-muted">Also known as: {c.nicknames.join(", ")}</p>
            )}

            {c.about && (
              <section className="mt-6">
                <h2 className="font-display text-xl font-bold">About</h2>
                <p className="mt-2 whitespace-pre-line leading-relaxed">{c.about.slice(0, 2000)}</p>
              </section>
            )}

            {c.voices.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-xl font-bold">Voice actors</h2>
                <ul className="mt-3 flex flex-wrap gap-3">
                  {c.voices.map((v, i) => (
                    <li key={`${v.name}-${i}`} className="flex items-center gap-2 rounded-full border-2 border-ink bg-surface py-1 pl-1 pr-4">
                      {v.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.image} alt="" loading="lazy" className="h-9 w-9 rounded-full object-cover" />
                      )}
                      <span className="text-sm font-semibold">{v.name}</span>
                      <span className="text-xs text-muted">{v.language}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        {c.anime.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl font-bold">Appears in</h2>
            <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {c.anime.map((a) => (
                <li key={a.malId} className="overflow-hidden rounded-2xl border-2 border-ink bg-surface">
                  {a.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.image} alt={a.title} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                  )}
                  <div className="p-2">
                    <p className="text-sm font-semibold leading-tight">{a.title}</p>
                    <p className="text-xs text-muted">{a.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
