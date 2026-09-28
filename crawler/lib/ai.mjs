/*
Plain-Node mirror of the crawler AI client. Crawler scripts run via `node`
(no TypeScript build), so they can't import lib/ai.ts — same reason
lib/slug.mjs mirrors lib/slug.ts. Keep the two in sync.

Gemini is the only provider used by the offline generators. Its OpenAI-
compatible endpoint keeps the crawler configuration small and predictable.
*/

import { withRetry, RetryableError, isRetryableHttpError } from "./retry.mjs";

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
const TIMEOUT_MS = 90_000;
const MAX_RETRY_AFTER_MS = 30_000;

async function callProvider(provider, userPrompt, opts) {
  const apiKey = process.env[provider.keyEnv];
  if (!apiKey) throw new Error(`${provider.keyEnv} is not configured.`);

  const model = opts.model ?? process.env[provider.modelEnv] ?? provider.defaultModel;
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
      max_tokens: opts.maxTokens ?? 4000,
      temperature: opts.temperature ?? 0.6,
    };
    if (model.includes("gpt-oss")) body.reasoning_effort = opts.reasoning ?? "low";
    if (opts.json) body.response_format = { type: "json_object" };

    const res = await fetch(provider.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (res.status === 408 || res.status === 409 || res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get("retry-after"));
      throw new RetryableError(`${provider.name} responded ${res.status}`, {
        retryAfterMs: Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, MAX_RETRY_AFTER_MS)
          : 15_000,
      });
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${provider.name} responded ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const out = data.choices?.[0]?.message?.content?.trim();
    if (!out) throw new Error(`${provider.name} returned an empty response.`);
    return out;
  } finally {
    clearTimeout(timeout);
  }
}

const PROVIDERS = [
  {
    name: "gemini",
    keyEnv: "GEMINI_API_KEY",
    modelEnv: "GEMINI_MODEL",
    defaultModel: DEFAULT_GEMINI_MODEL,
    endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  },
];

export function getConfiguredModel() {
  const provider = PROVIDERS.find((candidate) => process.env[candidate.keyEnv]);
  return provider ? process.env[provider.modelEnv] ?? provider.defaultModel : "unconfigured";
}

export async function generateWithAI(userPrompt, opts = {}) {
  const configured = PROVIDERS.filter((provider) => process.env[provider.keyEnv]);
  if (!configured.length) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return withRetry(() => callProvider(configured[0], userPrompt, opts), {
    retries: 2,
    maxDelayMs: MAX_RETRY_AFTER_MS,
    label: configured[0].name,
    isRetryable: isRetryableHttpError,
  });
}

export function generateWithGemini(userPrompt, opts = {}) {
  return generateWithAI(userPrompt, opts);
}
