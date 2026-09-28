import type { FaqItem } from "@/components/ui/Faq";
import type { Franchise } from "@/lib/api/franchises";
import type { MediaItem } from "@/lib/api/normalize";

export interface GuideTopic {
  slug: string;
  title: string;
  description: string;
  faq: FaqItem[];
  genres?: string[];
  kind?: "movie" | "anime";
  mediaType?: string;
  titleTerms?: string[];
}

export const ENDING_TOPICS: GuideTopic[] = [
  {
    slug: "mind-bending-endings",
    title: "Mind-bending endings",
    description: "Clear explanations for stories that bend time, identity, memory, or reality in their final scenes.",
    genres: ["Science Fiction", "Mystery", "Fantasy"],
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
      { q: "Do horror ending guides explain the monster or curse?", a: "When the available story facts establish an origin or rule, the guide explains it. When the film leaves the threat unexplained, the guide says so instead of inventing lore." },
      { q: "Are the final deaths discussed?", a: "Yes. The ending section is spoiler-forward and covers confirmed fates, survival, and unresolved outcomes where the story supports them." },
      { q: "Can I read these without seeing the movie?", a: "You can, but the guides reveal major scares, deaths, and final twists. They work best as a post-watch reference." },
    ],
  },
  {
    slug: "sci-fi-endings",
    title: "Science-fiction endings",
    description: "Explanations of time loops, artificial intelligence, alien encounters, parallel worlds, and the choices that close the story.",
    genres: ["Science Fiction"],
    faq: [
      { q: "Do these guides explain the science literally?", a: "They explain the story's internal rules and consequences, not whether its science would work in real life." },
      { q: "What if a science-fiction ending is intentionally ambiguous?", a: "The guide lays out the confirmed events first, then notes the strongest supported readings without presenting speculation as canon." },
      { q: "Are older science-fiction films included?", a: "Yes. The collection is based on published guides in the catalog, so it can include classics as well as recent releases." },
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
    slug: "animated-endings",
    title: "Animated endings",
    description: "Thoughtful explanations of animated films where visual motifs, family choices, and a final image carry the emotional payoff.",
    genres: ["Animation"],
    faq: [
      { q: "Do animated ending guides only cover family films?", a: "No. The topic groups published animated titles across audiences and countries; the common thread is the importance of visual storytelling in the ending." },
      { q: "Will the guide discuss symbolism?", a: "Yes, but symbolic readings are labeled as readings. The guide first establishes what the characters and story actually do." },
      { q: "Can I find a watch order from an animated franchise?", a: "When a related franchise guide exists, the title page links to it so you can switch from the ending explanation to the recommended order." },
    ],
  },
  {
    slug: "franchise-endings",
    title: "Franchise finales",
    description: "The last chapter explained: how a franchise closes its arcs, answers its questions, and leaves its world behind.",
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
    slug: "superhero-universes",
    title: "Superhero universes",
    description: "Recommended routes through connected heroes, crossover events, origin stories, and the films that set up what comes next.",
    mediaType: "movie",
    titleTerms: ["marvel", "dc", "superman", "batman", "spider", "avenger", "x-men"],
    faq: [
      { q: "Should I watch superhero films in release order?", a: "Usually, yes for a first watch because post-credit scenes and character introductions were designed around release order. A guide will call out exceptions." },
      { q: "Do I need every spin-off?", a: "No. The order notes which entries are core, optional, or useful context so you can choose a shorter route without losing the main arc." },
      { q: "Are television series included?", a: "Only when they are represented in the published franchise data. The page makes the scope clear instead of implying that unlisted episodes are covered." },
    ],
  },
  {
    slug: "horror-franchises",
    title: "Horror franchises",
    description: "Find the right order for slashers, supernatural series, remakes, reboots, and timelines that do not move in a straight line.",
    mediaType: "movie",
    titleTerms: ["horror", "evil", "scream", "conjuring", "saw", " halloween", "alien"],
    faq: [
      { q: "Do horror franchises need chronological order?", a: "Not always. Release order often preserves reveals, while chronological order can clarify the fictional timeline. Each guide explains which priority shaped its recommendation." },
      { q: "How are remakes handled?", a: "Remakes and reboots are listed as separate entries when the franchise data treats them as separate continuities, with notes explaining whether they replace or extend the original." },
      { q: "Can I skip a sequel?", a: "The entry notes show whether a sequel is essential to the ongoing story or can be skipped without making the next film confusing." },
    ],
  },
  {
    slug: "science-fiction-sagas",
    title: "Science-fiction sagas",
    description: "A practical path through space operas, time-travel stories, dystopian series, and speculative worlds with overlapping timelines.",
    mediaType: "movie",
    titleTerms: ["star", "galaxy", "planet", "terminator", "matrix", "dune", "alien"],
    faq: [
      { q: "Is chronological order better for science-fiction sagas?", a: "It depends on the saga. Release order often protects discoveries, while chronology can help on a rewatch. The guide states which experience its order favors." },
      { q: "How are alternate timelines shown?", a: "Entries are grouped by the continuity they belong to, and notes explain when a sequel branches from or resets the earlier timeline." },
      { q: "What should I watch after the main saga?", a: "Optional spin-offs appear after the core route when the data supports a useful placement, so the main story remains easy to follow." },
    ],
  },
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
  {
    slug: "fantasy-worlds",
    title: "Fantasy worlds",
    description: "Watch orders for magical worlds, quest films, prequels, and companion stories where lore and chronology can pull in different directions.",
    mediaType: "mixed",
    titleTerms: ["lord", "ring", "hobbit", "harry", "fantastic", "witch", "dragon"],
    faq: [
      { q: "Should fantasy prequels come first?", a: "For a first viewing, release order is often better because prequels may assume the audience already knows the original world. The guide explains when chronology is the better choice." },
      { q: "Are companion stories required?", a: "No. They are separated from the essential route when they add background rather than continue the central plot." },
      { q: "Can I switch to chronological order later?", a: "Yes. A release-order first watch followed by a chronological rewatch is often useful for comparing how the world was revealed with when events occur." },
    ],
  },
  {
    slug: "connected-movie-series",
    title: "Connected movie series",
    description: "A sensible route through sequels, crossovers, side stories, and shared worlds without turning the watch list into guesswork.",
    mediaType: "movie",
    titleTerms: ["universe", "franchise", "mission", "jurassic", "fast", "planet", "king"],
    faq: [
      { q: "What makes a movie series connected?", a: "The entries share characters, a setting, continuity, or recurring story consequences. The guide only groups titles where the franchise data supports a connection." },
      { q: "Are crossovers placed before or after solo films?", a: "The recommended order follows the story context needed for the crossover, while notes explain why a release-date order may differ." },
      { q: "How long is each watch order?", a: "The page states the number of entries and lists them individually, so you can plan the full route or choose an informed stopping point." },
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