/*
Plain-Node mirror of the two prompts in lib/prompts.ts used by the offline
generators. Keep prompt text in sync with the TypeScript version.
*/

export function buildPrompt(task, input) {
  switch (task) {
    case "ending-explained-generate":
      return [
        `You write an "Ending Explained" guide for a ${input.kind} database site.`,
        "Using only the facts given below, write original copy in your own",
        "words. Structure the response as four sections, each starting on its",
        "own line with the exact header shown, in this order:",
        "",
        "RECAP: 2-3 sentences summarizing the plot up to the climax.",
        "ENDING: A clear, spoiler-forward breakdown of how it ends and what",
        "  happens to the main character(s). Be specific.",
        "THEMES: 2-3 sentences on the underlying themes or meaning.",
        "FAQ: 3 to 5 question-and-answer pairs people search for about this",
        '  ending, each as "Q: ..." then "A: ..." on the next line.',
        "",
        "Total length must be at least 700 words. No preamble, no closing",
        "remarks, no markdown formatting.",
        "",
        `Title: ${input.title}${input.year ? ` (${input.year})` : ""}`,
        input.genres ? `Genres: ${input.genres}` : "",
        input.cast ? `Key cast/characters: ${input.cast}` : "",
        `Known plot/synopsis facts: ${input.query}`,
      ].filter(Boolean).join("\n");

    case "watch-order-draft":
      return [
        "You are a franchise-continuity expert drafting a Watch Order guide.",
        `Franchise: ${input.title}.`,
        "Given the entries below (release order), write:",
        "1. A 2-3 sentence intro on the franchise and why watch order matters.",
        "2. The recommended watch order as a numbered list, one entry per line",
        "   (it may equal release order or differ, e.g. chronological).",
        '3. For each entry, one line "NOTE <entry title>: " with a one-sentence',
        "   reason for its placement.",
        "No preamble, no closing remarks, no markdown. A human editor reviews",
        "this before publishing, so favor correct and specific over exhaustive.",
        "",
        `Entries (release order): ${input.query}`,
      ].join("\n");

    default:
      throw new Error(`Unknown task: ${task}`);
  }
}

// ---------------------------------------------------------------------
// v2 prompts used by ending-explained-generator.mjs (grounded, JSON mode,
// with a separate fact-check pass). The task above is kept for older
// callers; the crawler now uses these.
// ---------------------------------------------------------------------

export const GUIDE_SYSTEM_PROMPT = [
  "You are a careful film and anime editor writing 'Ending Explained' guides.",
  "Accuracy matters more than flair. Use ONLY the source facts you are given.",
  "Never invent characters, scenes, deaths, twists or dialogue. If the sources",
  "do not say how something resolves, say the story leaves it open instead of",
  "guessing. Rewrite everything in your own words; never copy sentences from",
  "the sources. Plain prose only: no markdown, no headings, no bullet symbols.",
  "Interpretations of meaning are allowed but must be phrased as interpretation",
  "(for example: 'one reading is...'), never as established fact.",
].join(" ");

export function buildGuidePrompt(input) {
  return [
    `Write an Ending Explained guide for the ${input.kind} "${input.title}"${input.year ? ` (${input.year})` : ""}.`,
    "",
    "Return ONE JSON object with exactly these keys:",
    '  "metaDescription": string, 110-155 characters, a search snippet that says what the guide answers (no spoilers about who dies).',
    '  "keyTakeaways": array of 3-4 short strings (each one sentence) summarizing the ending and its meaning.',
    '  "recap": string, 150-190 words, spoiler-light summary of the setup and conflict up to the final act.',
    '  "ending": string, 300-420 words, a specific scene-by-scene account of the final act and closing scenes: what happens, to whom, and the final image or line of the story.',
    '  "themes": string, 150-220 words on what the ending means and the main themes it resolves.',
    '  "faq": array of 5 objects {"q","a"}: questions people really search after finishing it (who/what/why/does/is), each answer 35-70 words, each question ending with "?".',
    "",
    "Aim comfortably above 800 total words so the guide remains valid after editing. Use the character and place names exactly as in the sources. Mention the title in the text.",
    "",
    `TITLE: ${input.title}`,
    input.genres ? `GENRES: ${input.genres}` : "",
    input.cast ? `KEY CAST / CHARACTERS: ${input.cast}` : "",
    input.catalogSynopsis ? `CATALOG SYNOPSIS:\n${input.catalogSynopsis}` : "",
    input.plot ? `DETAILED PLOT (source facts, do not copy wording):\n${input.plot}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildVerifyPrompt(input, draft) {
  return [
    "You are a fact-checker. Compare the DRAFT guide against the SOURCES.",
    "List every specific claim in the draft (events, character fates, names,",
    "outcomes) that the sources do NOT support or that contradicts them.",
    "Interpretation phrased as opinion ('one reading is...') is allowed.",
    'Return ONE JSON object: {"unsupported":[{"claim":string,"reason":string}]}.',
    'If everything is supported, return {"unsupported":[]}.',
    "",
    `SOURCES for "${input.title}":`,
    input.catalogSynopsis ? `CATALOG SYNOPSIS:\n${input.catalogSynopsis}` : "",
    input.plot ? `DETAILED PLOT:\n${input.plot}` : "",
    "",
    "DRAFT:",
    JSON.stringify(draft),
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildRevisePrompt(input, draft, issues) {
  return [
    `Revise this Ending Explained guide for "${input.title}". Fix every issue below,`,
    "using only the SOURCES. Remove or correct any unsupported claim. Keep the same",
    "JSON keys and length targets, plain prose, no markdown. Return ONE JSON object.",
    "",
    "ISSUES TO FIX:",
    ...issues.map((i, n) => `${n + 1}. ${i}`),
    "",
    input.catalogSynopsis ? `CATALOG SYNOPSIS:\n${input.catalogSynopsis}` : "",
    input.plot ? `DETAILED PLOT:\n${input.plot}` : "",
    "",
    "CURRENT DRAFT:",
    JSON.stringify(draft),
  ]
    .filter(Boolean)
    .join("\n");
}
