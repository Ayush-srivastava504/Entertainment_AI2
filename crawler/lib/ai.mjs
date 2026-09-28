/*
Plain-Node mirror of lib/ai.ts's generateWithGroq. Crawler scripts run via
`node` (no TypeScript build), so they can't import lib/ai.ts — same reason
lib/slug.mjs mirrors lib/slug.ts. Keep the two in sync.

Default model is openai/gpt-oss-120b, the newest large model available on
Groq's free tier (no credit card, limited by rate limits only). Override
with GROQ_MODEL, e.g. llama-3.3-70b-versatile or llama-3.1-8b-instant.
Free-tier token-per-minute caps are tight, so 429s are retried using the
Retry-After header, and the generator script spaces requests out.
*/

import { withRetry, RetryableError, isRetryableHttpError } from "./retry.mjs";

export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const TIMEOUT_MS = 90_000;

async function callGroq(userPrompt, opts) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");

  const model = opts.model ?? process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const messages = [
      ...(opts.system ? [{ role: "system", content: opts.system }] : []),
      { role: "user", content: userPrompt },
    ];
    const body = {
      model,
      messages,
      // For reasoning models this budget also covers hidden reasoning tokens.
      max_tokens: opts.maxTokens ?? 4000,
      temperature: opts.temperature ?? 0.6,
    };
    // gpt-oss models think before answering; keep it short to save tokens.
    if (model.includes("gpt-oss")) body.reasoning_effort = "low";

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get("retry-after"));
      throw new RetryableError(`Groq responded ${res.status}`, {
        retryAfterMs: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 15_000,
      });
    }
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

export function generateWithGroq(userPrompt, opts = {}) {
  return withRetry(() => callGroq(userPrompt, opts), {
    retries: 3,
    maxDelayMs: 60_000,
    label: "groq",
    isRetryable: isRetryableHttpError,
  });
}
