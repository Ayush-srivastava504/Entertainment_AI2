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
    // Thinking models can spend the whole token budget on reasoning and return
    // an empty message; keep reasoning light so the answer always fits.
    if (model.includes("gpt-oss") || model.startsWith("gemini-3")) body.reasoning_effort = opts.reasoning ?? "low";
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
          : 8_000,
      });
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${provider.name} responded ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const out = data.choices?.[0]?.message?.content?.trim();
    if (!out) {
      const why = data.choices?.[0]?.finish_reason ?? "unknown";
      throw new RetryableError(`${provider.name} returned an empty response (finish_reason=${why})`, { retryAfterMs: 3_000 });
    }
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

// Models are tried in order. A 503/429 on one model is usually that model's
// capacity pool being busy, so switching models recovers far more often than
// waiting. Override with GEMINI_MODEL / GEMINI_FALLBACK_MODELS (comma list).
const DEFAULT_FALLBACKS = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
// Models the API said do not exist (404) are skipped for the rest of the run.
const deadModels = new Set();
let lastModelUsed = null;

export function getLastModelUsed() {
  return lastModelUsed ?? getConfiguredModel();
}

function modelChain(opts) {
  const fromEnv = (process.env.GEMINI_FALLBACK_MODELS ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  const primary = opts.model ?? process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  const chain = [...new Set([primary, ...(fromEnv.length ? fromEnv : DEFAULT_FALLBACKS)])];
  const alive = chain.filter((m) => !deadModels.has(m));
  return alive.length ? alive : chain;
}

export async function generateWithAI(userPrompt, opts = {}) {
  const provider = PROVIDERS.find((candidate) => process.env[candidate.keyEnv]);
  if (!provider) throw new Error("GEMINI_API_KEY is not configured.");

  let lastErr;
  for (const model of modelChain(opts)) {
    try {
      const out = await withRetry(() => callProvider(provider, userPrompt, { ...opts, model }), {
        retries: 1,
        maxDelayMs: MAX_RETRY_AFTER_MS,
        label: model,
        isRetryable: isRetryableHttpError,
      });
      lastModelUsed = model;
      return out;
    } catch (err) {
      lastErr = err;
      if (/responded 404/.test(err.message)) deadModels.add(model);
      console.warn(`    [ai] ${model} unavailable (${err.message}); trying next model.`);
    }
  }
  throw lastErr;
}

export function generateWithGemini(userPrompt, opts = {}) {
  return generateWithAI(userPrompt, opts);
}
