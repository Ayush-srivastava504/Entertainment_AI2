/*
Anime girl PFP (profile picture) moods for /anime-girl-pfp.

Built from real search demand: Bing (Nov 2026) showed impressions at
positions 8-10 for "anime girl pfp" and mood variants ("laugh", "blushing",
"cute", "dark aesthetic") with no page on the site targeting them.

Each sticker goes to the FIRST mood whose pattern matches its file id, so
no image repeats on the page. Matching is on the id (the filename, which
names the expression), not the generated description, which is too loose.

A mood gets its own URL only once it holds enough images to stand alone as
a page (see MIN_IMAGES_FOR_OWN_PAGE); until then it is a section with an
anchor (#cute) on the main page. Same rule as everywhere else on the site:
no thin URLs.
*/

import type { GifItem } from "@/lib/api/gifs";

export interface PfpMood {
  slug: string;
  label: string;
  heading: string;
  intro: string;
  /** Background colour of the downloaded square PFP. */
  bg: string;
  match: RegExp;
}

export const MIN_IMAGES_FOR_OWN_PAGE = 24;

export const PFP_MOODS: PfpMood[] = [
  {
    slug: "blushing",
    label: "Blushing",
    heading: "Blushing & lovestruck anime girl PFPs",
    intro: "Pink cheeks, floating hearts and shy smiles. These read well even at the tiny size chat apps show profile pictures.",
    bg: "#ffd6e4",
    match: /blush|love|heart|shy|kiss/,
  },
  {
    slug: "laughing",
    label: "Laughing",
    heading: "Laughing & happy anime girl PFPs",
    intro: "Big grins and mid-laugh expressions for a profile that looks friendly before anyone has read a word.",
    bg: "#fff1b8",
    match: /laugh|giggl|cheer|happy|grin|smil/,
  },
  {
    slug: "cute",
    label: "Cute",
    heading: "Cute anime girl PFPs",
    intro: "Winks, peace signs and chibi poses: the classic cute anime girl profile picture.",
    bg: "#d9f2ff",
    match: /cute|wink|peace|chibi|kawaii|sparkl/,
  },
  {
    slug: "pout",
    label: "Pouting",
    heading: "Pouting & tsundere anime girl PFPs",
    intro: "Crossed arms, puffed cheeks and tsundere glares, for a profile picture with a bit of attitude.",
    bg: "#ffe0cc",
    match: /pout|angry|tsun|mad|annoy|fist/,
  },
  {
    slug: "dark",
    label: "Dark aesthetic",
    heading: "Dark aesthetic & gothic anime girl PFPs",
    intro: "Gothic dresses, bats, witches and moody colours. A popular choice for Discord and gaming profiles.",
    bg: "#2a2335",
    match: /gothic|dark|vampire|witch|bat|midnight/,
  },
  {
    slug: "sleepy",
    label: "Sleepy",
    heading: "Sleepy & cozy anime girl PFPs",
    intro: "Yawns, pillows and good-night stickers for a calm, cozy profile picture.",
    bg: "#e3dcff",
    match: /sleep|tired|night|yawn|cozy/,
  },
];

/** Groups stickers by mood, each sticker in at most one mood, in PFP_MOODS order. */
export function groupByMood(items: GifItem[]): { mood: PfpMood; items: GifItem[] }[] {
  const used = new Set<string>();
  return PFP_MOODS.map((mood) => {
    const hits = items.filter((g) => !used.has(g.id) && mood.match.test(g.id.toLowerCase()));
    hits.forEach((g) => used.add(g.id));
    return { mood, items: hits };
  }).filter((g) => g.items.length > 0);
}
