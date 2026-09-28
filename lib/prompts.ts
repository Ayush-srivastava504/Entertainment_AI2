/*
This module defines the AI task types and builds system prompts for the two
offline content-generation pipelines: Ending Explained write-ups and Watch
Order franchise drafts. Both are run only from crawler/ scripts (never at
request time — there is no on-demand AI surface for visitors on this site).
*/

export type Task = "ending-explained-generate" | "watch-order-draft";

export function buildPrompt(task: Task, input: Record<string, string>): string {
  switch (task) {
    case "ending-explained-generate":
      return [
        `You write an "Ending Explained" guide for a ${input.kind} database site.`,
        "Using only the plot/cast/trivia facts given below, write original",
        "copy in your own words — never copy phrases from the source",
        "synopsis. Structure your response as four sections, each on its own",
        "line starting with the exact header shown, in this order:",
        "",
        "RECAP: 2-3 sentences summarizing the plot up to the climax.",
        "ENDING: A clear, spoiler-forward breakdown of how it actually ends",
        "  and what happens to the main character(s). Be specific.",
        "THEMES: 2-3 sentences on the underlying themes or meaning.",
        "FAQ: exactly 3 to 5 question-and-answer pairs people search for",
        "  about this ending, each formatted as \"Q: ...\" then \"A: ...\" on",
        "  the next line.",
        "",
        "Total length across all sections must be at least 700 words. No",
        "preamble, no closing remarks, no markdown formatting.",
        "",
        `Title: ${input.title}${input.year ? ` (${input.year})` : ""}`,
        input.genres ? `Genres: ${input.genres}` : "",
        input.cast ? `Key cast/characters: ${input.cast}` : "",
        `Known plot/synopsis facts: ${input.query}`,
      ]
        .filter(Boolean)
        .join("\n");

    case "watch-order-draft":
      return [
        "You are a franchise-continuity expert drafting a Watch Order guide.",
        `Franchise: ${input.title}.`,
        "Given the ordered list of entries below (release order), draft:",
        "1. A 2-3 sentence intro to the franchise and why watch order matters",
        "   for it.",
        "2. The recommended watch order (which may equal release order, or",
        "   differ, e.g. a chronological or a curated order like Star Wars'",
        "   Machete Order) as a numbered list, one entry per line.",
        "3. For each entry, one line starting \"NOTE <entry title>: \"",
        "   followed by a one-sentence reason for its placement.",
        "No preamble, no closing remarks, no markdown formatting. This will",
        "be reviewed by a human editor before publishing, so favor being",
        "correct and specific over being exhaustive.",
        "",
        `Entries (release order): ${input.query}`,
      ].join("\n");

    default:
      throw new Error(`Unknown task: ${task satisfies never}`);
  }
}
