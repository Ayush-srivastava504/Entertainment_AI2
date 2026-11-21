import type { Metadata } from "next";
import Link from "next/link";
import { getBaseUrl, SITE_NAME } from "@/lib/site";
import { fitTitle, INDEX_ROBOTS } from "@/lib/seo";
import { socialMeta } from "@/lib/og";
import { breadcrumbNode, graph, jsonLdString, WEBSITE_ID } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Faq } from "@/components/ui/Faq";
import { listOriginalGifs } from "@/lib/api/original-gifs";
import { collectionForSticker, shortStickerTitle } from "@/lib/sticker-collections";
import { groupByMood } from "@/lib/pfp";
import PfpDownloadButton from "@/components/stickers/PfpDownloadButton";

// Static, rebuilt hourly. listOriginalGifs throws on a storage error, so a
// failed rebuild keeps the last good page instead of caching an empty one.
export const revalidate = 3600;

const BASE_URL = getBaseUrl();
const PATH = "/anime-girl-pfp";
const TITLE = fitTitle(["Anime Girl PFP: Cute, Blushing & Dark Aesthetic", "Anime Girl PFP: Free Profile Pictures", "Anime Girl PFP"]);
const DESCRIPTION =
  "Free anime girl PFPs: cute, blushing, laughing, pouting and dark aesthetic profile pictures. Save any one as a square PFP for Discord, WhatsApp or Instagram.";

const FAQ = [
  {
    q: "What is an anime girl PFP?",
    a: "PFP means profile picture: the small image next to your name on Discord, WhatsApp, Instagram, X and similar apps. An anime girl PFP is an anime-style girl used as that picture, usually chosen for her expression: cute, blushing, laughing or a darker aesthetic.",
  },
  {
    q: "How do I use one of these as my profile picture?",
    a: "Tap Download PFP under the picture you like. It saves a square 1024 x 1024 PNG with a solid background; then upload it as your profile picture in the app. Most apps crop profile pictures to a circle, and every image here is centred with a margin so nothing important is cut off.",
  },
  {
    q: "Why does the download add a background?",
    a: "The originals are stickers with a transparent background. Used directly as a profile picture, the transparent part shows up as plain black or white depending on the app. The PFP download fills it with a soft colour that suits the mood.",
  },
  {
    q: "Can I use an animated GIF as my PFP?",
    a: "The PFP download saves a still image of the first frame, which works in every app. To keep the animation, open the image and save the original GIF instead; only some apps show animated profile pictures.",
  },
  {
    q: "Are these PFPs free?",
    a: `Yes. Every picture on ${SITE_NAME} is free to download for personal use, such as profile pictures, chats and reactions. No sign-up is needed.`,
  },
];

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${BASE_URL}${PATH}` },
  robots: INDEX_ROBOTS,
  ...socialMeta({
    title: TITLE,
    description: DESCRIPTION,
    path: PATH,
    cardTitle: "Anime Girl PFP",
    cardSubtitle: "Cute, blushing, laughing and dark aesthetic profile pictures",
    badge: "PFP",
  }),
};

export default async function AnimeGirlPfpPage() {
  const groups = groupByMood(await listOriginalGifs());
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const lead = groups[0]?.items[0];

  const jsonLd = graph(
    {
      "@type": "CollectionPage",
      "@id": `${BASE_URL}${PATH}#webpage`,
      url: `${BASE_URL}${PATH}`,
      name: "Anime Girl PFP",
      description: DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": WEBSITE_ID },
      breadcrumb: { "@id": `${BASE_URL}${PATH}#breadcrumb` },
      ...(lead ? { primaryImageOfPage: { "@id": `${BASE_URL}${PATH}#primary-image` } } : {}),
    },
    ...(lead
      ? [{ "@type": "ImageObject", "@id": `${BASE_URL}${PATH}#primary-image`, contentUrl: lead.fullUrl, caption: lead.alt ?? lead.title }]
      : []),
    {
      "@id": `${BASE_URL}${PATH}#breadcrumb`,
      ...breadcrumbNode([
        { name: "Home", path: "/" },
        { name: "Anime girl PFP", path: PATH },
      ]),
    },
    {
      "@type": "ImageGallery",
      "@id": `${BASE_URL}${PATH}#gallery`,
      url: `${BASE_URL}${PATH}`,
      name: "Anime girl PFPs",
      image: groups.flatMap((g) => g.items.map((i) => i.fullUrl)),
    }
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <div className="bg-gradient-to-b from-heroFrom to-heroTo">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Anime girl PFP" }]} />
          <h1 className="mt-3 font-display text-3xl font-extrabold text-white sm:text-4xl">Anime Girl PFP</h1>
          <p className="mt-2 max-w-2xl text-white/90">
            {total} free anime girl profile pictures, sorted by mood. Tap <strong>Download PFP</strong> to save any of them as a
            square picture with a background, ready for Discord, WhatsApp or Instagram.
          </p>
          <nav aria-label="PFP moods" className="mt-5 flex flex-wrap gap-2">
            {groups.map(({ mood, items }) => (
              <a
                key={mood.slug}
                href={`#${mood.slug}`}
                className="rounded-full border-2 border-white/30 px-4 py-1.5 text-sm font-semibold text-white hover:border-tape hover:text-tape"
              >
                {mood.label} <span className="opacity-70">({items.length})</span>
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {groups.map(({ mood, items }) => (
          <section key={mood.slug} id={mood.slug} className="mb-14 scroll-mt-24" aria-labelledby={`${mood.slug}-h`}>
            <h2 id={`${mood.slug}-h`} className="font-display text-2xl font-extrabold">
              {mood.heading}
            </h2>
            <p className="mt-1 max-w-2xl text-muted">{mood.intro}</p>
            <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {items.map((g) => {
                const c = collectionForSticker(g);
                return (
                  <li key={g.id} className="rounded-2xl border-2 border-ink bg-surface p-3 shadow-blockSm">
                    <a href={g.fullUrl} target="_blank" rel="noopener" className="block">
                      <span
                        className="mx-auto block aspect-square w-full overflow-hidden rounded-full border-2 border-ink"
                        style={{ background: mood.bg }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={g.previewUrl}
                          alt={g.alt ?? `${g.title} anime girl PFP`}
                          width={g.width}
                          height={g.height}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-contain p-[7%]"
                        />
                      </span>
                    </a>
                    <p className="mt-2 truncate text-center text-xs font-semibold">{shortStickerTitle(g, c)}</p>
                    {c && (
                      <Link
                        href={`/stickers/${c.slug}#${encodeURIComponent(g.id)}`}
                        className="block truncate text-center text-xs text-beam underline underline-offset-2"
                      >
                        {c.label}
                      </Link>
                    )}
                    <div className="mt-2">
                      <PfpDownloadButton url={g.fullUrl} name={g.title} bg={mood.bg} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <div className="mt-6 max-w-3xl">
          <Faq items={FAQ} title="Anime girl PFP questions" />
        </div>

        <p className="mt-10 flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/stickers" className="text-sm font-semibold text-beam underline underline-offset-4">
            All stickers &amp; GIFs
          </Link>
          <Link href="/wallpapers" className="text-sm font-semibold text-beam underline underline-offset-4">
            Anime girl wallpapers
          </Link>
          <Link href="/stickers/maker" className="text-sm font-semibold text-beam underline underline-offset-4">
            Make a sticker from your own photo
          </Link>
        </p>
      </div>
    </>
  );
}
