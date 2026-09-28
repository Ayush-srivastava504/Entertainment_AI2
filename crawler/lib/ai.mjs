/*
Plain-Node mirror of the crawler AI client. Crawler scripts run via `node`
(no TypeScript build), so they can't import lib/ai.ts — same reason
lib/slug.mjs mirrors lib/slug.ts. Keep the two in sync.

DeepSeek is preferred when DEEPSEEK_API_KEY is configured. Groq remains a
fallback for rate limits, outages, and missing DeepSeek credentials.
*/

import { withRetry, RetryableError, isRetryableHttpError } from "./retry.mjs";

export const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";
export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const TIMEOUT_MS = 90_000;

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
        retryAfterMs: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 15_000,
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
    name: "deepseek",
    keyEnv: "DEEPSEEK_API_KEY",
    modelEnv: "DEEPSEEK_MODEL",
    defaultModel: DEFAULT_DEEPSEEK_MODEL,
    endpoint: "https://api.deepseek.com/chat/completions",
  },
  {
    name: "groq",
    keyEnv: "GROQ_API_KEY",
    modelEnv: "GROQ_MODEL",
    defaultModel: DEFAULT_GROQ_MODEL,
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
  },
];

export function getConfiguredModel() {
  const provider = PROVIDERS.find((candidate) => process.env[candidate.keyEnv]);
  return provider ? process.env[provider.modelEnv] ?? provider.defaultModel : "unconfigured";
}

export async function generateWithAI(userPrompt, opts = {}) {
  const configured = PROVIDERS.filter((provider) => process.env[provider.keyEnv]);
  if (!configured.length) {
    throw new Error("Neither DEEPSEEK_API_KEY nor GROQ_API_KEY is configured.");
  }

  let lastError;
  for (const provider of configured) {
    try {
      return await withRetry(() => callProvider(provider, userPrompt, opts), {
        retries: 2,
        maxDelayMs: 45_000,
        label: provider.name,
        isRetryable: isRetryableHttpError,
      });
    } catch (err) {
      lastError = err;
      if (provider !== configured.at(-1)) {
        console.warn(`    [fallback] ${provider.name} unavailable: ${err.message}; trying ${configured[configured.indexOf(provider) + 1].name}`);
      }
    }
  }
  throw lastError;
}

// Backward-compatible name used by existing crawler scripts.
export function generateWithGroq(userPrompt, opts = {}) {
  return generateWithAI(userPrompt, opts);
}
