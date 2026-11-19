import type { FaqItem } from "@/components/ui/Faq";
import type { Franchise } from "@/lib/api/franchises";
import type { MediaItem } from "@/lib/api/normalize";

export interface GuideTopic {
  slug: string;
  title: string;
  description: string;
  faq: FaqItem[];
  genres?: string[];
  kind?: "anime";
  mediaType?: string;
  titleTerms?: string[];
}

export const ENDING_TOPICS: GuideTopic[] = [
  {
    slug: "mind-bending-endings",
    title: "Mind-bending endings",
    description: "Clear explanations for stories that bend time, identity, memory, or reality in their final scenes.",
    genres: ["Sci-Fi", "Mystery", "Psychological", "Fantasy"],
    faq: [
      { q: "What makes an ending mind-bending?", a: "These stories change how earlier scenes should be read. The explanation tracks the reveal, the clues that support it, and what remains deliberately uncertain." },
      { q: "Do these guides spoil the central twist?", a: "Yes. The point of this collection is to explain the twist and its consequences, so read only after finishing the title." },
      { q: "Will the guide separate facts from interpretation?", a: "Yes. Plot events are described directly, while symbolism and competing readings are identified as interpretation rather than fact." },
    ],
  },
  {
    slug: "horror-endings",
    title: "Horror endings",
    description: "Spoiler-forward breakdowns of curses, creatures, survival choices, and the final image that lingers after a horror story ends.",
    genres: ["Horror", "Thriller"],
    faq: [
      { q: "Do horror ending guides explain the monster or curse?", a: "When the available story facts establish an origin or rule, the guide explains it. When the story leaves the threat unexplained, the guide says so instead of inventing lore." },
      { q: "Are the final deaths discussed?", a: "Yes. The ending section is spoiler-forward and covers confirmed fates, survival, and unresolved outcomes where the story supports them." },
      { q: "Can I read these before watching?", a: "You can, but the guides reveal major scares, deaths, and final twists. They work best as a post-watch reference." },
    ],
  },
  {
    slug: "sci-fi-endings",
    title: "Science-fiction endings",
    description: "Explanations of time loops, artificial intelligence, alien encounters, parallel worlds, and the choices that close the story.",
    genres: ["Sci-Fi", "Mecha"],
    faq: [
      { q: "Do these guides explain the science literally?", a: "They explain the story's internal rules and consequences, not whether its science would work in real life." },
      { q: "What if a science-fiction ending is intentionally ambiguous?", a: "The guide lays out the confirmed events first, then notes the strongest supported readings without presenting speculation as canon." },
      { q: "Are older science-fiction anime included?", a: "Yes. The collection is based on published guides in the catalog, so it can include classics as well as recent releases." },
    ],
  },
  {
    slug: "anime-finales",
    title: "Anime finales",
    description: "Ending explained guides for anime stories, from character resolutions and final battles to the meaning of the last episode.",
    kind: "anime",
    faq: [
      { q: "Does an anime finale guide cover the whole series?", a: "It focuses on the published title's ending and gives enough recap to place the final conflict in context." },
      { q: "What if the anime does not adapt the full manga?", a: "The guide describes the anime's actual ending and identifies an open ending rather than substituting events from another version." },
      { q: "Are spoilers marked clearly?", a: "Yes. These are spoiler-forward pages, and the ending section is placed behind the site's spoiler reveal control." },
    ],
  },
  {
    slug: "romance-endings",
    title: "Romance endings",
    description: "Who ends up together, what the confession scene changes, and what the final episode says about the couple's future.",
    genres: ["Romance"],
    faq: [
      { q: "Do romance ending guides say who ends up together?", a: "Yes. The ending section states the confirmed relationship outcomes, and notes when the story leaves a pairing open." },
      { q: "What if the anime ends before the manga's ending?", a: "The guide covers the anime's own ending and says when the relationship is left unresolved, rather than borrowing events from another version." },
      { q: "Are the confession and final scenes spoiled?", a: "Yes. These are spoiler-forward pages, with the ending placed behind the site's spoiler reveal control." },
    ],
  },
  {
    slug: "franchise-endings",
    title: "Franchise finales",
    description: "The last chapter explained: how a long-running anime closes its arcs, answers its questions, and leaves its world behind.",
    genres: ["Action", "Adventure", "Drama"],
    faq: [
      { q: "Should I read a franchise finale guide before earlier entries?", a: "No. Finale guides assume the full story and can reveal unresolved mysteries and character fates from earlier entries." },
      { q: "How do I know which order to watch first?", a: "Use the linked watch order when one is available. It lists the entries in a first-time viewing order and explains deviations from release order." },
      { q: "Does the guide explain post-credit scenes?", a: "It covers a post-credit scene when it is part of the title's documented ending facts and changes how the finale should be understood." },
    ],
  },
];

export const WATCH_ORDER_TOPICS: GuideTopic[] = [
  {
    slug: "anime-long-runners",
    title: "Anime long-runners",
    description: "Start a long anime franchise without losing track of seasons, films, specials, recap episodes, or the main story route.",
    mediaType: "anime",
    faq: [
      { q: "Are anime films always part of the main story?", a: "No. The guide distinguishes entries that advance the main continuity from side stories and optional films when the published franchise data supports that distinction." },
      { q: "How should I handle recap episodes?", a: "Recaps are identified when they appear in the guide data, so you can decide whether to watch them or move on without accidentally skipping a new story segment." },
      { q: "Does the order include every season?", a: "It includes the entries recorded for that published franchise. The page's count and numbered list show exactly what the guide covers." },
    ],
  },
];

export function findTopic(topics: GuideTopic[], slug: string) {
  return topics.find((topic) => topic.slug === slug) ?? null;
}

export function matchesMediaTopic(item: MediaItem, topic: GuideTopic) {
  if (topic.kind && item.kind !== topic.kind) return false;
  if (!topic.genres?.length) return true;
  const genres = item.genres.map((genre) => genre.toLowerCase());
  return topic.genres.some((genre) => genres.includes(genre.toLowerCase()));
}

export function matchesFranchiseTopic(franchise: Franchise, topic: GuideTopic) {
  if (topic.mediaType && franchise.mediaType !== topic.mediaType) return false;
  if (!topic.titleTerms?.length) return true;
  const title = franchise.title.toLowerCase();
  return topic.titleTerms.some((term) => title.includes(term.trim().toLowerCase()));
}