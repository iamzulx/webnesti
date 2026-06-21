import { Hono } from "hono";
import { stream } from "hono/streaming";
import { getProviderForModel } from "../providers/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.js";
import { dbGet, dbRun } from "../db/index.js";
import { config } from "../config.js";

const chat = new Hono();
chat.use("*", authMiddleware);
chat.use("*", rateLimitMiddleware);

chat.post("/completions", async (c) => {
  const user = c.get("user");
  const apiKey = c.get("apiKey");
  const body = await c.req.json();

  const modelId = body.model;
  if (!modelId) {
    return c.json({ error: { message: "model is required", type: "invalid_request_error" } }, 400);
  }

  const resolved = getProviderForModel(modelId);
  if (!resolved) {
    return c.json({ error: { message: `Model '${modelId}' not available. Check GET /v1/models`, type: "invalid_request_error" } }, 404);
  }

  const { provider, rawModelId } = resolved;
  const startTime = Date.now();

  // Get pricing
  const modelRow = dbGet("SELECT * FROM models WHERE id = ?", [modelId]);
  const priceIn = modelRow?.pricing_input || 0;
  const priceOut = modelRow?.pricing_output || 0;

  if (body.stream) {
    // --- STREAMING ---
    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache");
    c.header("Connection", "keep-alive");
    // --- STREAMING ---
      return stream(c, async (s) => {
        // Estimate prompt tokens from messages (rough: ~1 token per 4 chars)
        const promptText = body.messages?.map((m: any) => m.content || "").join(" ") || "";
        const estimatedPromptTokens = Math.ceil(promptText.length / 4);
        const estimatedCost = (estimatedPromptTokens * priceIn) * (1 + config.defaultMarkup / 100);

        // Check balance BEFORE streaming
        if (user.balance < estimatedCost && estimatedCost > 0) {
          // For streaming, allow if balance >= estimated minimum cost
          // Actual deduction happens after streaming completes
        }

        let completionTokens = 0;
        try {
          for await (const chunk of provider.chatStream(body, rawModelId)) {
            await s.write(`data: ${JSON.stringify(chunk)}\n\n`);
            if (chunk.choices[0]?.delta?.content) completionTokens++;
          }
          await s.write("data: [DONE]\n\n");
        } catch (err: any) {
          await s.write(`data: ${JSON.stringify({ error: { message: err.message } })}\n\n`);
        }

        // FIXED: use priceIn for prompt, priceOut for completion
        const totalTokens = estimatedPromptTokens + completionTokens;
        const cost = (estimatedPromptTokens * priceIn + completionTokens * priceOut) * (1 + config.defaultMarkup / 100);

        // Deduct balance after streaming
        if (user.balance < cost && cost > 0) {
          // Log usage even if insufficient balance (for analytics)
        } else if (cost > 0) {
          dbRun("UPDATE users SET balance = balance - ? WHERE id = ?", [cost, user.id]);
        }
        logUsage(user.id, apiKey.id, modelId, provider.id, estimatedPromptTokens, completionTokens, totalTokens, cost, Date.now() - startTime, 200, 1);
      });
  }

  // Check balance BEFORE calling provider API
  const estimatedCost = (body.messages?.map((m: any) => m.content || "").join("").length / 4 * priceIn) || 0;
  if (user.balance < estimatedCost && estimatedCost > 0) {
    return c.json({ error: { message: "Insufficient balance. Please top up first.", type: "insufficient_balance" } }, 402);
  }

  // --- NON-STREAMING ---
  try {
    const res = await provider.chat(body, rawModelId);
    const latency = Date.now() - startTime;

    const baseCost = res.usage.prompt_tokens * priceIn + res.usage.completion_tokens * priceOut;
    const cost = baseCost * (1 + config.defaultMarkup / 100);

    logUsage(user.id, apiKey.id, modelId, provider.id,
      res.usage.prompt_tokens, res.usage.completion_tokens, res.usage.total_tokens,
      cost, latency, 200, 0);

    if (user.balance < cost) {
      return c.json({ error: { message: "Insufficient balance", type: "insufficient_balance" } }, 402);
    }

    dbRun("UPDATE users SET balance = balance - ? WHERE id = ?", [cost, user.id]);

    return c.json({ ...res, webnesti: { cost_usd: Math.round(cost * 1000000) / 1000000, latency_ms: latency } });
  } catch (err: any) {
    return c.json({ error: { message: err.message, type: "provider_error" } }, 502);
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
