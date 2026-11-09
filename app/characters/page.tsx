import type { Metadata } from "next";
import Link from "next/link";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { characterSlug, getTopCharacters, searchCharacters } from "@/lib/characters";

const BASE_URL = getBaseUrl();
const TITLE = `Anime Characters — Profiles, Voice Actors & Fans' Favorites | ${SITE_NAME}`;
const DESCRIPTION =
  "Browse the most loved anime characters: profiles, nicknames, which anime they appear in and who voices them. Search any character.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${BASE_URL}/characters` },
};

type SP = { q?: string; page?: string };

export default async function CharactersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Math.min(200, Number(sp.page) || 1));
  const data = q ? await searchCharacters(q, page) : await getTopCharacters(page);

  const href = (p: number) => `/characters?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <>
      <div className="bg-gradient-to-b from-heroFrom to-heroTo">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Characters" }]} />
          <h1 className="mt-3 font-display text-3xl font-extrabold text-white sm:text-4xl">Anime Characters</h1>
          <p className="mt-2 max-w-2xl text-white/90">{DESCRIPTION}</p>
          <form action="/characters" className="mt-5 flex max-w-xl gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search a character, e.g. Zero Two"
              aria-label="Search characters"
              className="min-h-11 flex-1 rounded-full border-2 border-ink bg-surface px-4 text-ink"
            />
            <button className="min-h-11 rounded-full border-2 border-ink bg-beam px-5 font-semibold text-white hover:bg-beamDeep">
              Search
            </button>
          </form>
          <Link href="/characters/leads" className="mt-4 inline-block font-semibold text-white underline">
            Female leads of 50 trending anime →
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h2 className="font-display text-xl font-bold">{q ? `Results for “${q}”` : "Most loved characters"}</h2>

        {data.items.length === 0 ? (
          <p className="mt-6 text-muted">No characters found{q ? " — try another spelling." : " right now. Please try again shortly."}</p>
        ) : (
          <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.items.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/characters/${characterSlug(c)}`}
                  className="block overflow-hidden rounded-2xl border-2 border-ink bg-surface shadow-block transition-transform hover:-translate-y-0.5"
                >
                  {c.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt={c.name} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                  )}
                  <div className="p-3">
                    <p className="font-semibold leading-tight">{c.name}</p>
                    {c.nameKanji && <p className="text-sm text-muted">{c.nameKanji}</p>}
                    <p className="mt-1 text-sm text-muted">♥ {c.favorites.toLocaleString()}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex items-center justify-between">
          {page > 1 ? (
            <Link href={href(page - 1)} className="inline-flex min-h-11 items-center rounded-full border-2 border-ink px-5 font-semibold hover:bg-tape">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          {data.hasNext && (
            <Link href={href(page + 1)} className="inline-flex min-h-11 items-center rounded-full border-2 border-ink px-5 font-semibold hover:bg-tape">
              Next →
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
