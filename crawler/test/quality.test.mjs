import test from "node:test";
import assert from "node:assert/strict";
import { parseModelJson, normalizeGuide, validateGuide, guideWordCount } from "../lib/quality.mjs";
import { extractPlotSection, titleMatches } from "../lib/wikipedia.mjs";

const filler = (n, seed = "word") => Array.from({ length: n }, (_, i) => `${seed}${i}`).join(" ");
const sentences = (n, seed) =>
  Array.from({ length: n }, (_, i) => `In scene ${i} of ${seed} the hero faces choice number ${i} and moves on.`).join(" ");

function goodGuide() {
  return normalizeGuide({
    metaDescription: "What really happens at the end of Test Movie, who survives, and what the final scene means for the story.",
    keyTakeaways: ["Test Movie ends with the hero leaving.", "The final scene is deliberately open.", "The theme is sacrifice."],
    recap: `Test Movie sets up a conflict. ${sentences(12, "recap")}`,
    ending: `The ending of Test Movie unfolds slowly. ${sentences(20, "ending")}`,
    themes: `Test Movie is about sacrifice. ${sentences(10, "themes")}`,
    faq: [1, 2, 3, 4, 5].map((n) => ({
      q: `Question number ${n} about the finale?`,
      a: `${filler(20, `answer${n}x`)} the answer ends here for question ${n}.`,
    })),
  });
}

test("parseModelJson tolerates code fences and chatter", () => {
  assert.deepEqual(parseModelJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseModelJson('Here you go: {"a":2} thanks'), { a: 2 });
  assert.throws(() => parseModelJson("no json here"));
});

test("a complete guide passes the gate", () => {
  const g = goodGuide();
  assert.ok(guideWordCount(g) >= 700, `word count ${guideWordCount(g)}`);
  assert.deepEqual(validateGuide(g, { title: "Test Movie" }), []);
});

test("short, markdown and placeholder text is rejected", () => {
  const g = goodGuide();
  g.ending = "**Bold** short ending [insert scene]";
  const problems = validateGuide(g, { title: "Test Movie" }).join(" | ");
  assert.match(problems, /ending is \d+ words/);
  assert.match(problems, /banned pattern/);
});

test("faq shape is enforced", () => {
  const g = goodGuide();
  g.faq = g.faq.slice(0, 2);
  g.faq[0].q = "not a question";
  const problems = validateGuide(g, { title: "Test Movie" }).join(" | ");
  assert.match(problems, /faq has 2 items/);
  assert.match(problems, /does not end with/);
});

test("missing title mention is flagged", () => {
  const g = goodGuide();
  const problems = validateGuide(g, { title: "Completely Different Title" });
  assert.ok(problems.some((p) => p.includes("never mentions the title")));
});

test("wikipedia plot extraction", () => {
  const text = "Intro text.\n\n== Plot ==\nThe hero wakes up.\n=== Part two ===\nThen he leaves.\n\n== Cast ==\nA list.\n";
  const plot = extractPlotSection(text);
  assert.match(plot, /The hero wakes up/);
  assert.match(plot, /Then he leaves/);
  assert.doesNotMatch(plot, /A list/);
  assert.equal(extractPlotSection("nothing useful"), "");
});

test("title matching is accent and punctuation tolerant", () => {
  assert.ok(titleMatches("Amélie (film)", "Amelie"));
  assert.ok(titleMatches("Spider-Man: Into the Spider-Verse", "Spider-Man Into the Spider-Verse"));
  assert.ok(!titleMatches("Inception (film)", "Interstellar"));
});
