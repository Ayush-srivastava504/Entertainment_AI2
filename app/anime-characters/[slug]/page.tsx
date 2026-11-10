import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { fitTitle } from "@/lib/seo";
import { socialMeta } from "@/lib/og";
import { breadcrumbNode, graph, jsonLdString } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { characterSlug, getCharacter, parseCharacterId } from "@/lib/characters";
import { getDbCharacterBySlug, getLegacyCharacterRedirect, getRelatedCharacters, type DbCharacter } from "@/lib/characters-db";

const BASE_URL = getBaseUrl();

type Params = { slug: string };

/** Cut at a word boundary so meta descriptions never end mid-word. */
function snip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

function describeDb(c: DbCharacter): string {
  const first = c.anime[0];
  const lead = `${c.name}${first ? ` from ${first.title}` : ""}: profile, voice actors and anime appearances.`;
  const body = c.overview ?? c.about;
  return snip(body ? `${lead} ${body}` : lead, 158);
}

function faqFor(c: DbCharacter): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];
  const first = c.anime[0];
  if (first) {
    out.push({
      q: `Who is ${c.name}?`,
      a: `${c.name}${c.nameNative ? ` (${c.nameNative})` : ""} is a ${(first.role ?? "").toLowerCase() || "featured"} character in the anime ${first.title}${first.year ? ` (${first.year})` : ""}${c.anime.length > 1 ? `, and also appears in ${c.anime.length - 1} other title${c.anime.length > 2 ? "s" : ""}` : ""}.`,
    });
  }
  if (c.anime.length) {
    out.push({
      q: `Which anime is ${c.name} in?`,
      a: `${c.name} appears in ${c.anime.slice(0, 5).map((a) => a.title).join(", ")}${c.anime.length > 5 ? " and more" : ""}.`,
    });
  }
  const jp = c.voiceActors.filter((v) => v.language === "Japanese").map((v) => v.name);
  const en = c.voiceActors.filter((v) => v.language === "English").map((v) => v.name);
  if (jp.length || en.length) {
    out.push({
      q: `Who voices ${c.name}?`,
      a: [jp.length ? `In Japanese, ${c.name} is voiced by ${jp.slice(0, 3).join(" and ")}.` : "", en.length ? `In English, the voice actor is ${en.slice(0, 3).join(" and ")}.` : ""]
        .filter(Boolean)
        .join(" "),
    });
  }
  if (c.age) out.push({ q: `How old is ${c.name}?`, a: `${c.name} is listed as ${c.age} years old.` });
  if (c.birthday) out.push({ q: `When is ${c.name}'s birthday?`, a: `${c.name}'s birthday is on ${formatBirthday(c.birthday)}.` });
  return out;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function formatBirthday(b: string): string {
  const [m, d] = b.split("/").map(Number);
  return MONTHS[m - 1] ? `${MONTHS[m - 1]} ${d}` : b;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;

  const db = await getDbCharacterBySlug(slug);
  if (db) {
    const show = db.anime[0]?.title;
    const title = fitTitle([
      ...(show ? [`${db.name} (${show}): Profile & Voice Actors`, `${db.name} (${show}) Profile`] : []),
      `${db.name}: Anime Character Profile & Voice Actors`,
      `${db.name} Anime Character Profile`,
    ]);
    const description = describeDb(db);
    const url = `${BASE_URL}/anime-characters/${db.slug}`;
    return {
      title: { absolute: title },
      description,
      alternates: { canonical: url },
      robots: db.noindex ? { index: false, follow: true } : undefined,
      ...socialMeta({
        title,
        description,
        path: `/anime-characters/${db.slug}`,
        cardTitle: db.name,
        cardSubtitle: db.anime[0] ? `${db.anime[0].title} · profile & voice actors` : "Anime character profile & voice actors",
        badge: "ANIME CHARACTER",
        poster: db.image ?? undefined,
        type: "profile",
      }),
    };
  }

  // Old "<id>-<name>" URL of a saved profile: the page itself 301s to the name slug.
  const moved = await getLegacyCharacterRedirect(slug);
  if (moved) permanentRedirect(`/anime-characters/${moved}`);

  const id = parseCharacterId(slug);
  const c = id ? await getCharacter(id) : null;
  if (!c) return { title: { absolute: `Character not found | ${SITE_NAME}` }, robots: { index: false } };

  const title = fitTitle([`${c.name}: Anime Character Profile & Voice Actors`, `${c.name} Anime Character Profile`]);
  const description = snip(c.about ?? `Profile of ${c.name}: appearances and voice actors.`, 155);
  const url = `${BASE_URL}/anime-characters/${characterSlug(c)}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    // Live MyAnimeList (Jikan) fallback, not a saved profile: thin and not in
    // the sitemap, so keep it out of the index but let crawlers follow links.
    robots: { index: false, follow: true },
    ...socialMeta({
      title,
      description,
      path: `/anime-characters/${characterSlug(c)}`,
      cardTitle: c.name,
      cardSubtitle: "Anime character profile & voice actors",
      badge: "ANIME CHARACTER",
      poster: c.image ?? undefined,
      type: "profile",
    }),
  };
}

export default async function CharacterPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  const db = await getDbCharacterBySlug(slug);
  if (db) return <DbProfile c={db} />;

  // Profiles moved from "/anime-characters/<id>-<name>" to "/anime-characters/<name>": 301 so rankings carry over.
  const moved = await getLegacyCharacterRedirect(slug);
  if (moved) permanentRedirect(`/anime-characters/${moved}`);

  const id = parseCharacterId(slug);
  if (!id) notFound();
  const c = await getCharacter(id);
  if (!c) notFound();

  const canonical = characterSlug(c);
  if (slug !== canonical) permanentRedirect(`/anime-characters/${canonical}`);

  const jsonLd = graph(
    {
      "@type": "ProfilePage",
      "@id": `${BASE_URL}/anime-characters/${canonical}#webpage`,
      url: `${BASE_URL}/anime-characters/${canonical}`,
      name: c.name,
      mainEntity: { "@type": "Person", name: c.name, alternateName: c.nameKanji ?? undefined, image: c.image ?? undefined },
    },
    breadcrumbNode([
      { name: "Home", path: "/" },
      { name: "Characters", path: "/anime-characters" },
      { name: c.name, path: `/anime-characters/${canonical}` },
    ])
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />

      <div className="bg-gradient-to-b from-heroFrom to-heroTo">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Characters", href: "/anime-characters" }, { name: c.name }]} />
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
                        <img src={v.image} alt={`${v.name}, voice actor`} loading="lazy" className="h-9 w-9 rounded-full object-cover" />
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

async function DbProfile({ c }: { c: DbCharacter }) {
  const url = `${BASE_URL}/anime-characters/${c.slug}`;
  const related = await getRelatedCharacters(c, 6);
  const faq = faqFor(c);
  const first = c.anime[0];

  const facts: [string, string][] = [
    c.nameNative ? ["Native name", c.nameNative] : null,
    first ? ["Main series", first.title] : null,
    c.gender ? ["Gender", c.gender] : null,
    c.age ? ["Age", c.age] : null,
    c.birthday ? ["Birthday", formatBirthday(c.birthday)] : null,
    c.bloodType ? ["Blood type", c.bloodType] : null,
    ["Fan favourites", `♥ ${c.favourites.toLocaleString()}`],
    c.popularRank ? ["Most-loved rank", `#${c.popularRank}`] : null,
    c.trendingRank ? ["Trending rank", `#${c.trendingRank}`] : null,
  ].filter(Boolean) as [string, string][];

  const voiceByLang = ["Japanese", "English"]
    .map((lang) => ({ lang, people: c.voiceActors.filter((v) => v.language === lang) }))
    .filter((g) => g.people.length);

  const jsonLd = graph(
    {
      "@type": "ProfilePage",
      "@id": `${url}#webpage`,
      url,
      name: `${c.name} — character profile`,
      dateModified: new Date(c.updatedAt).toISOString(),
      mainEntity: {
        "@type": "Person",
        name: c.name,
        alternateName: [c.nameNative, ...c.aliases].filter(Boolean),
        description: describeDb(c),
        gender: c.gender ?? undefined,
        image: c.image ?? undefined,
        sameAs: c.sourceUrl ? [c.sourceUrl] : undefined,
      },
    },
    breadcrumbNode([
      { name: "Home", path: "/" },
      { name: "Characters", path: "/anime-characters" },
      { name: c.name, path: `/anime-characters/${c.slug}` },
    ]),
    ...(faq.length
      ? [
          {
            "@type": "FAQPage",
            "@id": `${url}#faq`,
            mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]
      : [])
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />

      <div className="bg-gradient-to-b from-heroFrom to-heroTo">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Characters", href: "/anime-characters" }, { name: c.name }]} />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[260px_1fr]">
          <div>
            {c.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.image} alt={`${c.name}${first ? ` from ${first.title}` : ""}`} width={230} height={325} className="w-full rounded-2xl border-2 border-ink shadow-block" />
            )}
          </div>

          <div>
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

            {c.overview && (
              <section className="mt-6">
                <h2 className="font-display text-xl font-bold">Who is {c.name}?</h2>
                <div className="mt-2 space-y-3 leading-relaxed">
                  {c.overview.split(/\n{2,}/).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            )}

            {c.about && (
              <section className="mt-6">
                <h2 className="font-display text-xl font-bold">{c.overview ? "Official description" : `About ${c.name}`}</h2>
                <p className="mt-2 whitespace-pre-line leading-relaxed">{c.about}</p>
                {c.sourceUrl && (
                  <p className="mt-2 text-xs text-muted">
                    Description from{" "}
                    <a href={c.sourceUrl} rel="nofollow noopener" target="_blank" className="underline">
                      AniList
                    </a>
                    , spoilers removed.
                  </p>
                )}
              </section>
            )}

            {voiceByLang.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-xl font-bold">Voice actors</h2>
                {voiceByLang.map((g) => (
                  <div key={g.lang} className="mt-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-muted">{g.lang}</h3>
                    <ul className="mt-2 flex flex-wrap gap-3">
                      {g.people.map((v) => (
                        <li key={`${g.lang}-${v.name}`} className="flex items-center gap-2 rounded-full border-2 border-ink bg-surface py-1 pl-1 pr-4">
                          {v.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={v.image} alt={`${v.name}, voice actor`} width={36} height={36} loading="lazy" className="h-9 w-9 rounded-full object-cover" />
                          )}
                          <span className="text-sm font-semibold">{v.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>

        {c.anime.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl font-bold">Anime appearances</h2>
            <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
              {c.anime.map((a) => (
                <li key={a.id} className="overflow-hidden rounded-2xl border-2 border-ink bg-surface">
                  {a.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.image} alt={`${a.title} poster`} width={230} height={325} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                  )}
                  <div className="p-2">
                    <p className="text-sm font-semibold leading-tight">{a.title}</p>
                    <p className="text-xs text-muted">
                      {[a.role ? a.role.charAt(0) + a.role.slice(1).toLowerCase() : null, a.year, a.format?.replace(/_/g, " "), a.score ? `★ ${a.score}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {faq.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl font-bold">{c.name} FAQ</h2>
            <dl className="mt-3 space-y-4">
              {faq.map((f) => (
                <div key={f.q}>
                  <dt className="font-semibold">{f.q}</dt>
                  <dd className="mt-1 leading-relaxed text-muted">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl font-bold">More characters{first ? ` from ${first.title}` : ""}</h2>
            <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {related.map((r) => (
                <li key={r.id}>
                  <Link href={`/anime-characters/${r.slug}`} className="block overflow-hidden rounded-2xl border-2 border-ink bg-surface shadow-blockSm hover:-translate-y-0.5">
                    {r.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.image} alt={r.name} width={230} height={325} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                    )}
                    <p className="p-2 text-sm font-semibold leading-tight">{r.name}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-10 flex flex-wrap gap-4 text-sm font-semibold">
          <Link href="/anime-characters" className="underline">All anime characters</Link>
          <Link href="/anime-characters/leads" className="underline">Trending anime leads</Link>
        </p>
      </div>
    </>
  );
}
