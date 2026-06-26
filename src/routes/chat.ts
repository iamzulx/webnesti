import { Hono } from "hono";
import { stream } from "hono/streaming";
import { bodyLimit } from "hono/body-limit";
import { getProviderForModel, getProviderMap, createProviderInstance } from "../providers/index.js";
import type { Provider } from "../providers/types.js";
import { authMiddleware } from "../middleware/auth.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.js";
import { dbGet, dbRun } from "../db/index.js";
import { config } from "../config.js";
import { resolveModel } from "../routing/router.js";
import { recordRequest } from "../routing/strategies.js";
import { decryptSecret } from "../encryption.js";
import { inc } from "../metrics.js";
import { logger } from "../logger.js";

const chat = new Hono();

// Request body limits to prevent resource-exhaustion / DoS.
const MAX_BODY_BYTES = 1_000_000; // 1 MB
const MAX_MESSAGES = 256;
const MAX_CONTENT_CHARS = 500_000; // total chars across all messages
const VALID_ROLES = new Set(["system", "user", "assistant", "tool", "function", "developer"]);

chat.use("*", bodyLimit({
  maxSize: MAX_BODY_BYTES,
  onError: (c) => c.json({ error: { message: "Request body too large", type: "invalid_request_error" } }, 413),
}));
chat.use("*", authMiddleware);
chat.use("*", rateLimitMiddleware);

interface ValidationResult {
  ok: boolean;
  status?: number;
  message?: string;
  promptChars?: number;
}

// Validate and normalize the request body. Returns a structured error instead of
// trusting arbitrary client input, which is forwarded to upstream provider APIs.
function validateBody(body: any): ValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, status: 400, message: "Request body must be a JSON object" };
  }

  if (typeof body.model !== "string" || body.model.length === 0 || body.model.length > 256) {
    return { ok: false, status: 400, message: "model is required and must be a non-empty string" };
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return { ok: false, status: 400, message: "messages is required and must be a non-empty array" };
  }
  if (body.messages.length > MAX_MESSAGES) {
    return { ok: false, status: 400, message: `messages must not exceed ${MAX_MESSAGES} entries` };
  }

  let promptChars = 0;
  for (const m of body.messages) {
    if (typeof m !== "object" || m === null || Array.isArray(m)) {
      return { ok: false, status: 400, message: "each message must be an object" };
    }
    if (typeof m.role !== "string" || !VALID_ROLES.has(m.role)) {
      return { ok: false, status: 400, message: "each message must have a valid role" };
    }
    // content may be a string or array (multimodal); only measure string length here.
    if (typeof m.content === "string") {
      promptChars += m.content.length;
    } else if (m.content != null && typeof m.content !== "object") {
      return { ok: false, status: 400, message: "message content must be a string or object" };
    }
  }
  if (promptChars > MAX_CONTENT_CHARS) {
    return { ok: false, status: 400, message: `total message content must not exceed ${MAX_CONTENT_CHARS} characters` };
  }

  // Optional numeric parameters: enforce types and sane ranges.
  if (body.temperature !== undefined && (typeof body.temperature !== "number" || !Number.isFinite(body.temperature) || body.temperature < 0 || body.temperature > 2)) {
    return { ok: false, status: 400, message: "temperature must be a number between 0 and 2" };
  }
  if (body.top_p !== undefined && (typeof body.top_p !== "number" || !Number.isFinite(body.top_p) || body.top_p <= 0 || body.top_p > 1)) {
    return { ok: false, status: 400, message: "top_p must be a number between 0 and 1" };
  }
  if (body.max_tokens !== undefined && (typeof body.max_tokens !== "number" || !Number.isInteger(body.max_tokens) || body.max_tokens <= 0 || body.max_tokens > 200_000)) {
    return { ok: false, status: 400, message: "max_tokens must be a positive integer" };
  }
  if (body.stream !== undefined && typeof body.stream !== "boolean") {
    return { ok: false, status: 400, message: "stream must be a boolean" };
  }

  // Optional multi-model fallback list (OpenRouter-style): try each model in
  // order until one succeeds. Non-streaming only.
  if (body.models !== undefined) {
    if (!Array.isArray(body.models) || body.models.length > 10) {
      return { ok: false, status: 400, message: "models must be an array of at most 10 model ids" };
    }
    for (const m of body.models) {
      if (typeof m !== "string" || m.length === 0 || m.length > 256) {
        return { ok: false, status: 400, message: "each models[] entry must be a non-empty string" };
      }
    }
  }

  return { ok: true, promptChars };
}

// Read the user's current balance from the DB rather than the (possibly stale)
// value captured at auth time, to reduce overspend windows.
function currentBalance(userId: string): number {
  const row = dbGet("SELECT balance FROM users WHERE id = ?", [userId]);
  return row?.balance ?? 0;
}

// Atomically deduct cost only if the balance still covers it. Returns true if the
// deduction was applied. The guarded WHERE prevents the balance from going negative
// under concurrent requests.
function deductBalance(userId: string, cost: number): boolean {
  if (cost <= 0) return true;
  const before = currentBalance(userId);
  if (before < cost) return false;
  dbRun("UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?", [cost, userId, cost]);
  return true;
}

function creditBalance(userId: string, amount: number): void {
  if (amount <= 0) return;
  dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [amount, userId]);
}

function spentThisMonth(apiKeyId: string): number {
  const row = dbGet("SELECT COALESCE(SUM(cost_usd), 0) AS total FROM usage_logs WHERE api_key_id = ? AND created_at >= datetime('now', 'start of month')", [apiKeyId]);
  return row?.total || 0;
}

function requestsToday(apiKeyId: string): number {
  const row = dbGet("SELECT COUNT(*) AS total FROM usage_logs WHERE api_key_id = ? AND created_at >= datetime('now', '-1 day')", [apiKeyId]);
  return row?.total || 0;
}

function enforceUsageCaps(apiKey: any, reserveCost: number): { ok: boolean; message?: string } {
  if (apiKey.daily_limit && requestsToday(apiKey.id) >= apiKey.daily_limit) {
    return { ok: false, message: "Daily request limit exceeded" };
  }
  if (apiKey.monthly_budget != null) {
    const remaining = Number(apiKey.monthly_budget) - spentThisMonth(apiKey.id);
    if (remaining < reserveCost) return { ok: false, message: "Monthly budget exceeded" };
  }
  return { ok: true };
}

function reserveCost(promptTokens: number, maxTokens: number | undefined, priceIn: number, priceOut: number, markup: number): number {
  // Pre-authorize against worst-case requested output, not only prompt cost.
  const outputCap = Math.min(
    typeof maxTokens === "number" && Number.isFinite(maxTokens) ? maxTokens : config.defaultMaxOutputTokens,
    config.defaultMaxOutputTokens,
  );
  return (promptTokens * priceIn + outputCap * priceOut) * markup;
}

interface PreparedModel {
  provider: Provider;       // BYOK-swapped instance when applicable
  rawModelId: string;
  modelId: string;          // catalog id (for pricing/billing/logging)
  priceIn: number;
  priceOut: number;
  markup: number;
  usingByok: boolean;
}

// Resolve a catalog model id into an executable provider + pricing, applying
// BYOK if the user registered their own key. Returns null when the model isn't
// in the active catalog (caller decides 404 vs trying the next fallback model).
// Centralizing this fixes a prior bug where non-streaming requests billed with
// BYOK markup (0%) while still executing against the platform key.
function prepareModel(modelId: string, userId: string): PreparedModel | null {
  const modelRow = dbGet("SELECT * FROM models WHERE id = ? AND is_active = 1", [modelId]);
  if (!modelRow) return null;

  const providers = getProviderMap();
  const routed = resolveModel(modelId, providers, "balanced");
  let provider: Provider, rawModelId: string;
  if (routed) {
    provider = routed.provider;
    rawModelId = routed.rawModelId;
  } else {
    const direct = getProviderForModel(modelId);
    if (!direct) return null;
    provider = direct.provider;
    rawModelId = direct.rawModelId;
  }

  // BYOK: swap to a per-request instance built from the user's encrypted key.
  let usingByok = false;
  try {
    const byok = dbGet("SELECT key_hash FROM byok_keys WHERE user_id = ? AND provider = ? LIMIT 1", [userId, provider.id]);
    if (byok?.key_hash) {
      const byokProvider = createProviderInstance(provider.id, decryptSecret(byok.key_hash));
      if (byokProvider) { provider = byokProvider; usingByok = true; }
    }
  } catch (err: any) {
    logger.warn("BYOK key decrypt failed", { provider: provider.id, error: err?.message });
  }

  return {
    provider,
    rawModelId,
    modelId,
    priceIn: modelRow.pricing_input || 0,
    priceOut: modelRow.pricing_output || 0,
    markup: usingByok ? 1 : (1 + config.defaultMarkup / 100),
    usingByok,
  };
}

chat.post("/completions", async (c) => {
  const user = c.get("user");
  const apiKey = c.get("apiKey");

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { message: "Invalid JSON in request body", type: "invalid_request_error" } }, 400);
  }

  const validation = validateBody(body);
  if (!validation.ok) {
    return c.json({ error: { message: validation.message, type: "invalid_request_error" } }, validation.status as any);
  }

  const modelId = body.model;

  // Resolve the primary model: catalog check + provider routing + BYOK + pricing.
  // prepareModel returns null when the model isn't in the active catalog, which
  // also blocks unlisted models from being forwarded at $0 cost.
  const prepared = prepareModel(modelId, user.id);
  if (!prepared) {
    return c.json({ error: { message: `Model '${modelId}' not available. Check GET /v1/models`, type: "invalid_request_error" } }, 404);
  }
  let { provider, rawModelId } = prepared;
  const { priceIn, priceOut, markup } = prepared;

  const startTime = Date.now();

  // Estimate prompt tokens from messages (rough: ~1 token per 4 chars).
  const estimatedPromptTokens = Math.ceil((validation.promptChars || 0) / 4);

  inc("chat_requests_total", 1, { model: modelId, stream: body.stream ? "1" : "0" });

  if (body.stream) {
    // --- STREAMING ---
    // Reserve worst-case cost BEFORE streaming. Once SSE bytes are sent we cannot
    // abort cleanly for billing failure, so reservation is mandatory. Final usage
    // later refunds any unused reserve.
    const reservedCost = reserveCost(estimatedPromptTokens, body.max_tokens, priceIn, priceOut, markup);
    const cap = enforceUsageCaps(apiKey, reservedCost);
    if (!cap.ok) return c.json({ error: { message: cap.message, type: "usage_limit_exceeded" } }, 402);
    if (!deductBalance(user.id, reservedCost)) {
      return c.json({ error: { message: "Insufficient balance. Please top up first.", type: "insufficient_balance" } }, 402);
    }

    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache");
    c.header("Connection", "keep-alive");

    return stream(c, async (s) => {
      let completionTokens = 0;
      let promptTokens = estimatedPromptTokens; // fallback estimate
      let actualProviderId = provider.id;
      let streamError = false;
      let usageReported = false;

      try {
        // Try primary provider first; if it fails mid-stream, we can't easily
        // switch providers (data already sent to client), so streaming only uses
        // the primary provider. Fallback is for non-streaming requests.
        for await (const chunk of provider.chatStream(body, rawModelId)) {
          await s.write(`data: ${JSON.stringify(chunk)}\n\n`);
          if (chunk.choices[0]?.delta?.content) completionTokens++;
          // Check for usage in final chunk (OpenAI stream_options / Anthropic message_delta)
          const chunkUsage = (chunk as any).usage;
          if (chunkUsage && typeof chunkUsage === "object") {
            if (chunkUsage.completion_tokens > 0) {
              completionTokens = chunkUsage.completion_tokens;
              usageReported = true;
            }
            if (chunkUsage.prompt_tokens > 0) {
              promptTokens = chunkUsage.prompt_tokens;
            }
          }
        }
        await s.write("data: [DONE]\n\n");
      } catch (err: any) {
        streamError = true;
        const safeMsg = String(err?.message || "").replace(/sk-[a-zA-Z0-9._-]+/g, "sk-***").replace(/Bearer [a-zA-Z0-9._-]+/g, "Bearer ***");
        logger.error("chat stream provider error", { provider: provider.id, model: modelId, error: safeMsg });
        inc("chat_errors_total", 1, { model: modelId, type: "stream" });
        recordRequest(provider.id, Date.now() - startTime, false);
        await s.write(`data: ${JSON.stringify({ error: { message: "Upstream provider error", type: "provider_error" } })}\n\n`);
      }

      if (!streamError) {
        recordRequest(actualProviderId, Date.now() - startTime, true);
      }

      // Use provider-reported tokens when available, otherwise fall back to estimates
      const finalPromptTokens = usageReported ? promptTokens : estimatedPromptTokens;
      const totalTokens = finalPromptTokens + completionTokens;
      const cost = (finalPromptTokens * priceIn + completionTokens * priceOut) * markup;

      inc("tokens_total", totalTokens, { model: modelId });

      // Reconcile the pre-stream reserve: refund unused amount. Never silently
      // ignore billing failure after bytes were streamed.
      if (reservedCost > cost) creditBalance(user.id, reservedCost - cost);
      logUsage(user.id, apiKey.id, modelId, actualProviderId, finalPromptTokens, completionTokens, totalTokens, cost, Date.now() - startTime, streamError ? 502 : 200, 1);
    });
  }

  // --- NON-STREAMING ---
  // Multi-model fallback (OpenRouter-style): try body.model first, then each id
  // in body.models[] until one succeeds. Each attempt uses THAT model's own
  // provider (BYOK-swapped), pricing, and markup — so billing always matches the
  // model that actually answered. Auth/transient errors move to the next model.
  const candidateIds: string[] = [modelId, ...(Array.isArray(body.models) ? body.models : [])];
  const tried: string[] = [];
  let lastErr = "";

  for (const candId of candidateIds) {
    const pm = candId === modelId ? prepared : prepareModel(candId, user.id);
    if (!pm) { lastErr = `Model '${candId}' not available`; continue; }
    tried.push(candId);

    // Balance/budget gate per candidate (price differs across models). Reserve
    // worst-case output before the provider call to prevent cost-drain attacks.
    const reservedCost = reserveCost(estimatedPromptTokens, body.max_tokens, pm.priceIn, pm.priceOut, pm.markup);
    const cap = enforceUsageCaps(apiKey, reservedCost);
    if (!cap.ok) return c.json({ error: { message: cap.message, type: "usage_limit_exceeded" } }, 402);
    if (!deductBalance(user.id, reservedCost)) {
      return c.json({ error: { message: "Insufficient balance. Please top up first.", type: "insufficient_balance" } }, 402);
    }

    const attemptStart = Date.now();
    try {
      const res = await pm.provider.chat(body, pm.rawModelId);
      const latency = Date.now() - startTime;
      recordRequest(pm.provider.id, Date.now() - attemptStart, true);

      const cost = (res.usage.prompt_tokens * pm.priceIn + res.usage.completion_tokens * pm.priceOut) * pm.markup;
      inc("tokens_total", res.usage.total_tokens, { model: pm.modelId });
      logUsage(user.id, apiKey.id, pm.modelId, pm.provider.id,
        res.usage.prompt_tokens, res.usage.completion_tokens, res.usage.total_tokens, cost, latency, 200, 0);

      if (reservedCost > cost) creditBalance(user.id, reservedCost - cost);

      return c.json({
        ...res,
        webnesti: {
          cost_usd: Math.round(cost * 1000000) / 1000000,
          latency_ms: latency,
          provider: pm.provider.id,
          model: pm.modelId,
          fallback_attempts: tried.length > 1 ? tried.length : undefined,
        },
      });
    } catch (err: any) {
      lastErr = "Upstream provider error";
      creditBalance(user.id, reservedCost);
      recordRequest(pm.provider.id, Date.now() - attemptStart, false);
      const safeMsg = String(err?.message || "").replace(/sk-[a-zA-Z0-9._-]+/g, "sk-***").replace(/Bearer [a-zA-Z0-9._-]+/g, "Bearer ***");
      logger.error("chat model attempt failed", { model: pm.modelId, provider: pm.provider.id, error: safeMsg });
      inc("chat_errors_total", 1, { model: pm.modelId, type: "non_stream" });
      // try next candidate
    }
  }

  return c.json({ error: { message: "All candidate models failed", type: "provider_error" } }, 502);
});

function logUsage(userId: string, apiKeyId: string, modelId: string, providerId: string,
  promptTokens: number, completionTokens: number, totalTokens: number,
  cost: number, latency: number, status: number, isStream: number) {
  try {
    dbRun(
      "INSERT INTO usage_logs (user_id, api_key_id, model_id, provider_id, prompt_tokens, completion_tokens, total_tokens, cost_usd, latency_ms, status_code, is_stream) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, apiKeyId, modelId, providerId, promptTokens, completionTokens, totalTokens, cost, latency, status, isStream]
    );
  } catch (err: any) {
    // Usage log failure must not break the request, but it should not be silent
    // either — a lost insert means lost billing/usage data.
    logger.error("usage log insert failed", { model: modelId, error: err?.message });
  }
}

export default chat;
