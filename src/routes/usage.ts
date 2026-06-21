import { Hono } from "hono";
import { dbAll, dbGet } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";

const usage = new Hono();
usage.use("*", authMiddleware);

// GET /api/usage — summary for current user
usage.get("/", (c) => {
  const user = c.get("user");

  const stats = dbGet(`
    SELECT
      COUNT(*) as total_requests,
      COALESCE(SUM(prompt_tokens), 0) as total_prompt_tokens,
      COALESCE(SUM(completion_tokens), 0) as total_completion_tokens,
      COALESCE(SUM(total_tokens), 0) as total_tokens,
      COALESCE(SUM(cost_usd), 0) as total_cost,
      COALESCE(AVG(latency_ms), 0) as avg_latency
    FROM usage_logs WHERE user_id = ?
  `, [user.id]);

  const byModel = dbAll(`
    SELECT model_id, provider_id,
      COUNT(*) as requests,
      SUM(prompt_tokens) as prompt_tokens,
      SUM(completion_tokens) as completion_tokens,
      SUM(total_tokens) as total_tokens,
      SUM(cost_usd) as cost,
      AVG(latency_ms) as avg_latency
    FROM usage_logs WHERE user_id = ?
    GROUP BY model_id ORDER BY cost DESC
  `, [user.id]);

  const recentLogs = dbAll(`
    SELECT * FROM usage_logs WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 50
  `, [user.id]);

  return c.json({
    user: { id: user.id, email: user.email, balance: user.balance, tier: user.tier },
    summary: stats,
    by_model: byModel,
    recent: recentLogs,
  });
});

export default usage;
