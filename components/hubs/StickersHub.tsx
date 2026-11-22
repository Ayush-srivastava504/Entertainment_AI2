/*
Body of the /stickers hub, shared by the static hub page (app/stickers/page.tsx)
and the search results view (app/stickers/search/page.tsx, which /stickers?q=
is rewritten to by middleware.ts). Keeping the plain hub free of
searchParams lets it be cached (ISR) instead of rendered on every request:
it was taking 2.2 s for every visitor and crawler.
*/
import Link from "next/link";
import { searchGifs } from "@/lib/api/gifs";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { breadcrumbNode, graph, jsonLdString, WEBSITE_ID } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import StickerCard from "@/components/stickers/StickerCard";
import { STICKER_COLLECTIONS, getStickersInCollection } from "@/lib/sticker-collections";

export const DEFAULT_QUERY = "cute anime girl";
export const STICKERS_TITLE = `Anime Girl Stickers & GIFs | ${SITE_NAME}`;
export const STICKERS_DESCRIPTION = "Browse and download anime girl GIFs and stickers — reactions, chibi, waves, blushes and more.";
export const STICKERS_PATH = "/stickers";

const trendingTags = [
  "cute anime girl",
  "anime wave",
  "anime blush",
  "chibi",
  "anime smile",
  "anime wink",
  "anime dance",
  "anime hug",
];

/** The /stickers hub. `query` is set only on search results (/stickers?q=). */
export default async function StickersHub({ query }: { query?: string }) {
  const q = query?.trim().slice(0, 80) || DEFAULT_QUERY;
  const [gifs, covers] = await Promise.all([
    searchGifs(q, 24),
    Promise.all(
      STICKER_COLLECTIONS.map(async (c) => {
        const items = await getStickersInCollection(c.slug).catch(() => []);
        return { c, cover: items[0], count: items.length };
      })
    ),
  ]);
  const collections = covers.filter((x) => x.count > 0);
  // The plain hub is a cached (ISR) page: if the sticker storage listing
  // failed, throw so the last good version stays cached instead of an empty one.
  if (!query && gifs.length === 0 && collections.length === 0) throw new Error("sticker listing unavailable");
  const BASE_URL = getBaseUrl();

  const pageJsonLd = graph(
    {
      "@type": "CollectionPage",
      "@id": `${BASE_URL}${STICKERS_PATH}#webpage`,
      url: `${BASE_URL}${STICKERS_PATH}`,
      name: STICKERS_TITLE,
      description: STICKERS_DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": WEBSITE_ID },
      breadcrumb: { "@id": `${BASE_URL}${STICKERS_PATH}#breadcrumb` },
    },
    {
      "@id": `${BASE_URL}${STICKERS_PATH}#breadcrumb`,
      ...breadcrumbNode([
        { name: "Home", path: "/" },
        { name: "Stickers & GIFs", path: STICKERS_PATH },
      ]),
    }
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(pageJsonLd) }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Stickers & GIFs" }]} />

      <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Anime girl stickers &amp; GIFs</h1>
      <p className="mt-2 max-w-2xl text-muted">{STICKERS_DESCRIPTION}</p>

      <Link
        href={`${STICKERS_PATH}/maker`}
        className="mt-5 flex max-w-xl items-center justify-between gap-4 rounded-2xl border-2 border-ink bg-gradient-to-r from-heroFrom to-heroTo p-4 shadow-block transition hover:-translate-y-0.5"
      >
        <span>
          <span className="block font-display text-lg font-extrabold text-white">Make your own sticker</span>
          <span className="block text-sm text-white/80">Turn any photo into a sticker: cut out, outline, caption. Free, on your phone.</span>
        </span>
        <span className="shrink-0 rounded-full bg-beam px-4 py-2 text-sm font-bold text-white">Open maker →</span>
      </Link>

      <form action={STICKERS_PATH} method="get" role="search" className="mt-5 flex max-w-xl gap-2">
        <label htmlFor="gif-q" className="sr-only">
          Search GIFs and stickers
        </label>
        <input
          id="gif-q"
          name="q"
          type="search"
          defaultValue={q === DEFAULT_QUERY ? "" : q}
          placeholder="Search e.g. anime wave, chibi, blush…"
          maxLength={80}
          className="min-h-11 w-full rounded-full border-2 border-ink bg-surface px-4 text-sm"
        />
        <button
          type="submit"
          className="min-h-11 shrink-0 rounded-full bg-beam px-5 text-sm font-bold text-white hover:bg-beamDeep"
        >
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {trendingTags.map((t) => (
          <Link
            key={t}
            href={`${STICKERS_PATH}?q=${encodeURIComponent(t)}`}
            aria-current={t === q ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-sm font-semibold hover:border-beam hover:text-beam ${
              t === q ? "border-beam bg-beam/10 text-beam" : "border-ink/20 bg-surface"
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {collections.length > 0 && (
        <section aria-labelledby="sticker-collections" className="mt-8">
          <h2 id="sticker-collections" className="font-display text-xl font-extrabold">
            Sticker collections
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {collections.map(({ c, cover, count }) => (
              <Link
                key={c.slug}
                href={`${STICKERS_PATH}/${c.slug}`}
                className="group overflow-hidden rounded-xl border-2 border-ink bg-surface hover:border-beam"
              >
                <div className="flex aspect-square items-center justify-center bg-ink/5 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cover!.previewUrl} alt={c.heading} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="px-2 py-1.5">
                  <p className="truncate text-sm font-bold group-hover:text-beam">{c.label}</p>
                  <p className="text-xs text-muted">{count} stickers</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {gifs.length > 0 && (
        <p className="mt-8 text-sm text-muted">
          {gifs.length} results for &ldquo;{q}&rdquo;
        </p>
      )}

      <div className="mt-3 columns-2 gap-3 sm:columns-3 md:columns-4">
        {gifs.map((g, i) => (
          <StickerCard key={g.id} item={g} eager={i < 4} />
        ))}
      </div>

      {!gifs.length && (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-ink/30 p-8 text-center">
          <p className="font-semibold">No results for &ldquo;{q}&rdquo;.</p>
          <p className="mt-1 text-sm text-muted">Try one of the tags above, or a simpler search like &ldquo;anime wave&rdquo;.</p>
          <Link href={STICKERS_PATH} className="mt-4 inline-block text-sm font-semibold text-beam underline underline-offset-4">
            Reset search
          </Link>
        </div>
      )}

      {/* The hub's own text: what the library is, which collection is for
          what, and how to use a sticker. Written once, not per sticker. */}
      <section className="mt-14 max-w-3xl space-y-8" aria-label="About these stickers and GIFs">
        <div>
          <h2 className="font-display text-2xl font-extrabold">Free anime girl stickers for every chat</h2>
          <div className="mt-3 space-y-3 leading-relaxed">
            <p>
              Every sticker and GIF here is an original anime girl drawing made for {SITE_NAME}, grouped into collections so you can
              find the right reaction quickly. Some sets follow a favourite character: Sakura Haruno from Naruto, Nami from One
              Piece, Orihime Inoue from Bleach, Noelle Silva from Black Clover, Mitsuha Miyamizu from Your Name, and nine of the My
              Hero Academia heroines. Others follow a mood or a look: gothic, crush, tsundere, Ghibli-style and everyday reactions.
            </p>
            <p>
              Stickers are still images with a transparent background, so they sit cleanly on top of any chat wallpaper. The
              animated collection holds looping GIFs instead, with soft motion like blinking eyes, drifting sakura petals and
              flickering lamps.
            </p>
          </div>
        </div>
        <div>
          <h2 className="font-display text-2xl font-extrabold">Which collection to open</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
            <li>
              <strong>Replying to friends:</strong> the <Link href={`${STICKERS_PATH}/reactions`} className="font-semibold text-beam underline underline-offset-2">reactions</Link> set
              covers laughing, blushing, pouting, crying and good night.
            </li>
            <li>
              <strong>Flirting:</strong> the <Link href={`${STICKERS_PATH}/crush`} className="font-semibold text-beam underline underline-offset-2">crush</Link> set is all winks,
              hearts and shy smiles; the <Link href={`${STICKERS_PATH}/tsundere`} className="font-semibold text-beam underline underline-offset-2">tsundere</Link> set is for
              pretending you are not flattered.
            </li>
            <li>
              <strong>Fan group chats:</strong> the character sets, starting with <Link href={`${STICKERS_PATH}/my-hero-academia`} className="font-semibold text-beam underline underline-offset-2">My Hero Academia</Link>, the biggest.
            </li>
            <li>
              <strong>Discord and gaming profiles:</strong> the <Link href={`${STICKERS_PATH}/gothic`} className="font-semibold text-beam underline underline-offset-2">gothic</Link> set for
              a darker look, or <Link href={`${STICKERS_PATH}/ghibli-style`} className="font-semibold text-beam underline underline-offset-2">Ghibli-style</Link> for a calm one.
            </li>
            <li>
              <strong>A profile picture:</strong> the <Link href="/anime-girl-pfp" className="font-semibold text-beam underline underline-offset-2">anime girl PFP</Link> page
              sorts the same drawings by mood and saves any of them as a square picture with a background.
            </li>
          </ul>
        </div>
        <div>
          <h2 className="font-display text-2xl font-extrabold">How to send one</h2>
          <div className="mt-3 space-y-3 leading-relaxed">
            <p>
              Tap <strong>Copy for WhatsApp</strong> under a sticker: it is turned into a 512 &times; 512 sticker image and copied, so
              you can paste it straight into WhatsApp, Telegram, Discord or Instagram messages. On phones that cannot copy images,
              the share sheet opens instead. The <strong>&darr;</strong> button saves the original file, and tapping the picture
              opens it full size.
            </p>
            <p>
              Want a sticker of yourself, a pet or a friend? The{" "}
              <Link href={`${STICKERS_PATH}/maker`} className="font-semibold text-beam underline underline-offset-2">sticker maker</Link> cuts the
              subject out of any photo on your phone, adds an outline and a caption, and nothing is uploaded.
            </p>
          </div>
        </div>
      </section>

      <p className="mt-10 text-sm text-muted">
        Want still images instead? Browse our{" "}
        <Link href="/wallpapers" className="font-semibold text-beam underline underline-offset-4 hover:text-beamDeep">
          anime girl wallpapers
        </Link>
        .
      </p>
    </div>
  );
}
