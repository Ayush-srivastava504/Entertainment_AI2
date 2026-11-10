/*
Sticker collections: groups of original stickers in the Supabase bucket,
matched by filename prefix (e.g. "naruto-sakura-haruno-laughing.png" belongs
to "naruto"). Each collection gets its own page at /stickers/<slug>. To add a
new set, upload files with a shared prefix and add an entry here.
*/

import type { GifItem } from "@/lib/api/gifs";
import { listOriginalGifs } from "@/lib/api/original-gifs";

export type StickerCollection = {
  slug: string;
  /** Short chip label. */
  label: string;
  /** H1 / page title. */
  heading: string;
  description: string;
  /** Filename prefix (without the "original-" id prefix). Omit to use `match`. */
  prefix?: string;
  match?: (g: GifItem) => boolean;
};

export const STICKER_COLLECTIONS: StickerCollection[] = [
  {
    slug: "naruto",
    label: "Naruto",
    heading: "Naruto Sakura Haruno Stickers",
    description: "Sakura Haruno anime stickers from Naruto: laughing, pouting, blushing, eating ramen and more.",
    prefix: "naruto-",
  },
  {
    slug: "one-piece",
    label: "One Piece",
    heading: "One Piece Nami Stickers",
    description: "Nami anime stickers from One Piece: winks, pouts, love hearts, straw hat hugs and more.",
    prefix: "one-piece-",
  },
  {
    slug: "my-hero-academia",
    label: "My Hero Academia",
    heading: "My Hero Academia Girls Stickers",
    description: "Stickers of the My Hero Academia girls: Ochaco, Momo, Tsuyu, Toga, Jiro, Mina, Nejire, Toru and Eri.",
    prefix: "my-hero-academia-",
  },
  {
    slug: "bleach",
    label: "Bleach",
    heading: "Bleach Orihime Inoue Stickers",
    description: "Orihime Inoue anime stickers from Bleach: laughing, winking, sleepy, shy blush and more.",
    prefix: "bleach-",
  },
  {
    slug: "black-clover",
    label: "Black Clover",
    heading: "Black Clover Noelle Silva Stickers",
    description: "Noelle Silva anime stickers from Black Clover: tsundere pouts, water magic, bubble tea and more.",
    prefix: "black-clover-",
  },
  {
    slug: "your-name",
    label: "Your Name",
    heading: "Your Name Mitsuha Miyamizu Stickers",
    description: "Mitsuha Miyamizu anime stickers from Your Name (Kimi no Na wa): giggles, pouts, cat cuddles and more.",
    prefix: "your-name-",
  },
  {
    slug: "ghibli-style",
    label: "Ghibli Style",
    heading: "Ghibli Style Cute Girl Stickers",
    description: "Soft, hand-drawn Ghibli-style anime girl stickers: witches, broom riders, forest spirits and tea time.",
    prefix: "ghibli-style-",
  },
  {
    slug: "gothic",
    label: "Gothic",
    heading: "Gothic Anime Girl Stickers",
    description: "Gothic anime girl stickers: lace veils, roses, vampires, dark angels and black cats.",
    prefix: "gothic-",
  },
  {
    slug: "crush",
    label: "Crush",
    heading: "Crush Anime Girl Stickers",
    description: "Blushing, lovestruck anime girl stickers to send your crush: winks, hearts and shy smiles.",
    prefix: "crush-anime-girl-",
  },
  {
    slug: "tsundere",
    label: "Tsundere",
    heading: "Tsundere Anime Girl Stickers",
    description: "Tsundere anime girl stickers: arms crossed, flustered blushes, pointing winks and more.",
    prefix: "tsundere-",
  },
  {
    slug: "animated",
    label: "Animated GIFs",
    heading: "Animated Anime Girl GIFs",
    description: "Looping animated anime girl GIFs: sakura nights, neon headphones, sunsets and Kerala scenes.",
    match: (g) => /\.gif$/i.test(g.fullUrl),
  },
  // Catch-all, must stay LAST: every original that fits no series prefix
  // above (e.g. "happy_hearts.png"). Without it those /gif pages had no hub
  // to link them, leaving them orphaned in the sitemap.
  {
    slug: "reactions",
    label: "Reactions",
    heading: "Cute Anime Girl Reaction Stickers",
    description: "Cute anime girl reaction stickers: happy hearts, shy blushes, angry pouts, sleepy kittens, boba tea and more.",
    match: (g) => !STICKER_COLLECTIONS.some((c) => c.slug !== "reactions" && belongsTo(c, g)),
  },
];

function belongsTo(c: StickerCollection, g: GifItem): boolean {
  if (c.match) return c.match(g);
  return !!c.prefix && g.id.startsWith(`original-${c.prefix}`);
}

export function getStickerCollection(slug: string): StickerCollection | undefined {
  return STICKER_COLLECTIONS.find((c) => c.slug === slug);
}

/** The first collection a sticker belongs to, if any. */
export function collectionForSticker(g: GifItem): StickerCollection | undefined {
  return STICKER_COLLECTIONS.find((c) => belongsTo(c, g));
}

export async function getStickersInCollection(slug: string): Promise<GifItem[]> {
  const c = getStickerCollection(slug);
  if (!c) return [];
  const all = await listOriginalGifs();
  // Bucket lists newest first; within a set, alphabetical reads better.
  return all.filter((g) => belongsTo(c, g)).sort((a, b) => a.id.localeCompare(b.id));
}

/** Card label inside a collection: drop the series name the page already shows,
 * e.g. "Naruto Sakura Haruno Laughing" -> "Sakura Haruno Laughing". */
export function shortStickerTitle(g: GifItem, c?: StickerCollection): string {
  if (!c?.prefix) return g.title;
  const words = c.prefix.split("-").filter(Boolean).length;
  const rest = g.title.split(" ").slice(words).join(" ");
  return rest || g.title;
}
