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
