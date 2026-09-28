/*
Plain-Node mirror of lib/ai.ts's generateWithGroq. Crawler scripts run via
`node` (no TypeScript build), so they can't import lib/ai.ts — same reason
lib/slug.mjs mirrors lib/slug.ts. Keep the two in sync.
*/

const TIMEOUT_MS = 30_000;

export async function generateWithGroq(userPrompt, opts = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");

  const model = opts.model ?? process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const messages = [
      ...(opts.system ? [{ role: "system", content: opts.system }] : []),
      { role: "user", content: userPrompt },
    ];
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: opts.maxTokens ?? 1600,
        temperature: opts.temperature ?? 0.6,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Groq responded ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    const out = data.choices?.[0]?.message?.content?.trim();
    if (!out) throw new Error("Groq returned an empty response.");
    return out;
  } finally {
    clearTimeout(timeout);
  }
}
