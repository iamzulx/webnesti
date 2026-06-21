import { Hono } from "hono";
import { stream } from "hono/streaming";
import { bodyLimit } from "hono/body-limit";
import { getProviderForModel } from "../providers/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.js";
import { dbGet, dbRun } from "../db/index.js";
import { config } from "../config.js";

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

  // Only allow models that are registered AND active in our catalog. Without this,
  // any model string on a loaded provider (e.g. an unlisted or deactivated model)
  // would be forwarded with no pricing row — running at $0 cost and bypassing both
  // the balance check and billing entirely.
  const modelRow = dbGet("SELECT * FROM models WHERE id = ? AND is_active = 1", [modelId]);
  if (!modelRow) {
    return c.json({ error: { message: `Model '${modelId}' not available. Check GET /v1/models`, type: "invalid_request_error" } }, 404);
  }

  const resolved = getProviderForModel(modelId);
  if (!resolved) {
    return c.json({ error: { message: `Model '${modelId}' not available. Check GET /v1/models`, type: "invalid_request_error" } }, 404);
  }

  const { provider, rawModelId } = resolved;
  const startTime = Date.now();

  const priceIn = modelRow.pricing_input || 0;
  const priceOut = modelRow.pricing_output || 0;

  // Estimate prompt tokens from messages (rough: ~1 token per 4 chars).
  const estimatedPromptTokens = Math.ceil((validation.promptChars || 0) / 4);
  const markup = 1 + config.defaultMarkup / 100;

  if (body.stream) {
    // --- STREAMING ---
    // Enforce balance BEFORE streaming. Require enough to cover at least the
    // estimated prompt cost; without this a depleted account could stream freely.
    const estimatedCost = estimatedPromptTokens * priceIn * markup;
    if (priceIn > 0 && currentBalance(user.id) <= 0) {
      return c.json({ error: { message: "Insufficient balance. Please top up first.", type: "insufficient_balance" } }, 402);
    }
    if (estimatedCost > 0 && currentBalance(user.id) < estimatedCost) {
      return c.json({ error: { message: "Insufficient balance. Please top up first.", type: "insufficient_balance" } }, 402);
    }

    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache");
    c.header("Connection", "keep-alive");

    return stream(c, async (s) => {
      let completionTokens = 0;
      try {
        for await (const chunk of provider.chatStream(body, rawModelId)) {
          await s.write(`data: ${JSON.stringify(chunk)}\n\n`);
          if (chunk.choices[0]?.delta?.content) completionTokens++;
        }
        await s.write("data: [DONE]\n\n");
      } catch (err: any) {
        console.error("[chat:stream] provider error", err);
        await s.write(`data: ${JSON.stringify({ error: { message: "Upstream provider error", type: "provider_error" } })}\n\n`);
      }

      const totalTokens = estimatedPromptTokens + completionTokens;
      const cost = (estimatedPromptTokens * priceIn + completionTokens * priceOut) * markup;

      // Deduct atomically; logs usage regardless of whether deduction succeeded.
      deductBalance(user.id, cost);
      logUsage(user.id, apiKey.id, modelId, provider.id, estimatedPromptTokens, completionTokens, totalTokens, cost, Date.now() - startTime, 200, 1);
    });
  }

  // Check balance BEFORE calling provider API (uses fresh balance).
  const estimatedCost = estimatedPromptTokens * priceIn * markup;
  if (estimatedCost > 0 && currentBalance(user.id) < estimatedCost) {
    return c.json({ error: { message: "Insufficient balance. Please top up first.", type: "insufficient_balance" } }, 402);
  }

  // --- NON-STREAMING ---
  try {
    const res = await provider.chat(body, rawModelId);
    const latency = Date.now() - startTime;

    const cost = (res.usage.prompt_tokens * priceIn + res.usage.completion_tokens * priceOut) * markup;

    logUsage(user.id, apiKey.id, modelId, provider.id,
      res.usage.prompt_tokens, res.usage.completion_tokens, res.usage.total_tokens,
      cost, latency, 200, 0);

    if (!deductBalance(user.id, cost)) {
      return c.json({ error: { message: "Insufficient balance", type: "insufficient_balance" } }, 402);
    }

    return c.json({ ...res, webnesti: { cost_usd: Math.round(cost * 1000000) / 1000000, latency_ms: latency } });
  } catch (err: any) {
    // Do not leak upstream provider error details to the client.
    console.error("[chat] provider error", err);
    return c.json({ error: { message: "Upstream provider error", type: "provider_error" } }, 502);
  }
});

function logUsage(userId: string, apiKeyId: string, modelId: string, providerId: string,
  promptTokens: number, completionTokens: number, totalTokens: number,
  cost: number, latency: number, status: number, isStream: number) {
  try {
    dbRun(
      "INSERT INTO usage_logs (user_id, api_key_id, model_id, provider_id, prompt_tokens, completion_tokens, total_tokens, cost_usd, latency_ms, status_code, is_stream) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, apiKeyId, modelId, providerId, promptTokens, completionTokens, totalTokens, cost, latency, status, isStream]
    );
  } catch {}
}

export default chat;
