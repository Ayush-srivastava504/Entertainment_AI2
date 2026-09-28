/*
Static FAQ copy for the pages that have no per-title data (home, list
pages, About). Per-title FAQs come from the generated guide content instead.
*/

import type { FaqItem } from "@/components/ui/Faq";

export const HOME_FAQ: FaqItem[] = [
  {
    q: "What is an ending explained guide?",
    a: "It is a plain-English breakdown of how a movie or anime ends: a short recap, exactly what happens in the final scenes, what the ending means, and answers to the questions people ask most after watching.",
  },
  {
    q: "Are the guides full of spoilers?",
    a: "Recaps are labeled spoiler-light. The ending explanation is spoiler-forward and hidden behind a reveal control, so you can stop before the spoilers.",
  },
  {
    q: "What is a watch order guide?",
    a: "It lists every entry in a franchise in the order that makes sense to watch them, and notes where release order and story order differ so you do not spoil yourself or get lost.",
  },
  {
    q: "How are the guides written?",
    a: "Ending explanations are AI-assisted using catalog facts and must pass a minimum-length check before publication. Watch order guides are drafted from catalog data and stay unpublished until a person reviews them.",
  },
  {
    q: "Can't find the title you are looking for?",
    a: "Search by title to check for an existing guide. If it is not here yet, send a title request using the form below.",
  },
];

export const ENDING_INDEX_FAQ: FaqItem[] = [
  {
    q: "How do I find the ending explained for a specific movie or anime?",
    a: "Use the search box at the top of this page or on the search page. Type the title and open the guide from the results.",
  },
  {
    q: "What does each guide include?",
    a: "A recap, how the story ends, the themes and meaning, an FAQ, quick facts, where to watch, and the cast, all on one page.",
  },
  {
    q: "Do the guides cover both movies and anime?",
    a: "Yes. Use the All, Movies and Anime filters above the list to narrow what you see.",
  },
  {
    q: "Where should I start if I have not seen the whole franchise?",
    a: "Read the franchise's watch order guide first, then come back to the ending explained guides once you have watched each entry.",
  },
];

export const WATCH_ORDER_INDEX_FAQ: FaqItem[] = [
  {
    q: "Should I watch in release order or story order?",
    a: "For most franchises release order is safest because it keeps surprises intact. Each guide explains when a different order gives a better experience and why.",
  },
  {
    q: "What is the difference between release, chronological and recommended order?",
    a: "Release order follows when each entry came out. Chronological order follows the in-story timeline. Recommended order is the editor's suggestion for the best first-time experience.",
  },
  {
    q: "Do I have to watch every entry?",
    a: "Not always. Each guide's notes explain how each entry fits, so you can see what is essential before you decide to skip anything.",
  },
  {
    q: "How are watch orders checked?",
    a: "They are drafted with AI from catalog data and stay hidden until a person has reviewed and approved them, since a wrong order can spoil a story.",
  },
];

export const ABOUT_FAQ: FaqItem[] = [
  {
    q: "Who runs Marquee?",
    a: "Marquee is a guide site for movie and anime endings and franchise watch orders.",
  },
  {
    q: "Do I need an account?",
    a: "No. Likes and saved titles are stored in your own browser. Comments are open without signing up and are moderated.",
  },
  {
    q: "Where does the movie and anime data come from?",
    a: "Movie details and cast come from TMDB, and anime details come from public anime databases. Guide text is written on top of that data.",
  },
  {
    q: "How can I report a mistake in a guide?",
    a: "Leave a comment on the guide page describing what is wrong. Comments are reviewed and guides are corrected when needed.",
  },
];
