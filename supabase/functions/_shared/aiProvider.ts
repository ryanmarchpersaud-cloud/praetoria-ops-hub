// Phase 1A — AI provider/model ADAPTER ONLY.
//
// This module exists so the Communications Hub can later switch between the
// Lovable AI Gateway, a direct OpenAI key, or another approved provider
// without redesigning anything. It is NOT wired into any customer-facing
// workflow in Phase 1A: nothing calls it with real correspondence.
//
// Rules enforced here:
//  * server-side only (never import into browser code)
//  * every response is validated against a caller-supplied schema validator
//  * malformed model output degrades to a typed failure, never a throw at the
//    call site and never a crash of the surrounding request

export type AiProviderId = "lovable" | "openai";

export type AiProviderConfig = {
  provider: AiProviderId;
  model: string;
  baseUrl: string;
  apiKeyEnv: string;
  authHeader: "bearer" | "lovable";
};

/** Verified available on this project's Lovable AI Gateway (2026-09-03). */
export const DEFAULT_MODEL = "openai/gpt-5.6-terra";

export const PROVIDERS: Record<AiProviderId, Omit<AiProviderConfig, "model">> = {
  lovable: {
    provider: "lovable",
    baseUrl: "https://ai.gateway.lovable.dev/v1",
    apiKeyEnv: "LOVABLE_API_KEY",
    authHeader: "bearer",
  },
  openai: {
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    authHeader: "bearer",
  },
};

export function resolveConfig(
  provider: AiProviderId = "lovable",
  model: string = DEFAULT_MODEL,
): AiProviderConfig {
  return { ...PROVIDERS[provider], model };
}

export type AiResult<T> =
  | { ok: true; data: T; raw: string; model: string; ms: number }
  | { ok: false; reason: "config" | "http" | "empty" | "invalid_json" | "schema"; status?: number; detail: string; raw?: string };

/**
 * Single structured-output call. `validate` must return the typed value or throw.
 * Any malformed output is returned as a typed failure so callers can fall back
 * to a fully manual workflow.
 */
export async function generateStructured<T>(
  opts: {
    system: string;
    user: string;
    validate: (parsed: unknown) => T;
    config?: AiProviderConfig;
    maxCompletionTokens?: number;
  },
): Promise<AiResult<T>> {
  const cfg = opts.config ?? resolveConfig();
  const key = Deno.env.get(cfg.apiKeyEnv);
  if (!key) return { ok: false, reason: "config", detail: `${cfg.apiKeyEnv} not configured` };

  const t0 = performance.now();
  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: cfg.model,
        reasoning_effort: "none",
        max_completion_tokens: opts.maxCompletionTokens ?? 800,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${opts.system}\nRespond with a single valid json object and nothing else.` },
          { role: "user", content: opts.user },
        ],
      }),
    });
  } catch (e) {
    return { ok: false, reason: "http", detail: String(e) };
  }

  if (!res.ok) {
    // 402 / 403 are terminal (credits or policy). 429 / 5xx are retryable with
    // backoff by the caller. AI unavailability must never block manual work.
    return { ok: false, reason: "http", status: res.status, detail: (await res.text()).slice(0, 500) };
  }

  const body = await res.json();
  const raw: string = body?.choices?.[0]?.message?.content ?? "";
  if (!raw.trim()) return { ok: false, reason: "empty", detail: "model returned no content" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid_json", detail: "model output was not valid json", raw: raw.slice(0, 500) };
  }

  try {
    const data = opts.validate(parsed);
    return { ok: true, data, raw, model: cfg.model, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return { ok: false, reason: "schema", detail: String(e), raw: raw.slice(0, 500) };
  }
}
