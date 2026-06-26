import { Hono } from "hono";
import { dbAll, dbGet, dbRun } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { getProviderMap } from "../providers/index.js";
import { invalidateByTag } from "../cache.js";

const admin = new Hono();

// Admin middleware — gated on the dedicated is_admin flag, NOT on tier. The
// enterprise tier is purchasable (and self-upgradeable), so conflating it with
// administrative privilege let any user who reached the tier balance grant
// themselves full platform control. is_admin must be set out-of-band (DB/ops).
admin.use("*", authMiddleware);
admin.use("*", async (c, next) => {
  const user = c.get("user");
  if (!user.is_admin) {
    return c.json({ error: "Admin access required" }, 403);
  }
  await next();
});

// GET /api/admin/users — list all users
admin.get("/users", (c) => {
  const page = parseInt(c.req.query("page") || "1");
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);
  const offset = (page - 1) * limit;

  const users = dbAll(
    "SELECT id, email, name, balance, tier, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [limit, offset]
  );
  const total = dbGet("SELECT COUNT(*) as count FROM users");

  return c.json({
    object: "list",
    data: users,
    pagination: { page, limit, total: total?.count || 0, pages: Math.ceil((total?.count || 0) / limit) },
  });
});

// GET /api/admin/users/:id — user detail with usage
admin.get("/users/:id", (c) => {
  const userId = c.req.param("id");
  const user = dbGet("SELECT id, email, name, balance, tier, created_at FROM users WHERE id = ?", [userId]);
  if (!user) return c.json({ error: "User not found" }, 404);

  const keys = dbAll("SELECT id, key_prefix, name, rate_limit, daily_limit, is_active, created_at FROM api_keys WHERE user_id = ?", [userId]);
  const usage = dbGet(`
    SELECT COUNT(*) as total_requests, COALESCE(SUM(cost_usd), 0) as total_cost,
    COALESCE(SUM(total_tokens), 0) as total_tokens
    FROM usage_logs WHERE user_id = ?
  `, [userId]);
  const recentLogs = dbAll("SELECT * FROM usage_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", [userId]);

  return c.json({ user, api_keys: keys, usage, recent_logs: recentLogs });
});

// PUT /api/admin/users/:id — update user
admin.put("/users/:id", async (c) => {
  const userId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const { name, tier, balance } = body;

  if (tier !== undefined && !["free", "starter", "pro", "enterprise", "suspended"].includes(tier)) {
    return c.json({ error: "Invalid tier" }, 400);
  }
  if (balance !== undefined && (typeof balance !== "number" || !Number.isFinite(balance))) {
    return c.json({ error: "Balance must be a finite number" }, 400);
  }

  const user = dbGet("SELECT id FROM users WHERE id = ?", [userId]);
  if (!user) return c.json({ error: "User not found" }, 404);

  if (name) dbRun("UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [name, userId]);
  if (tier) dbRun("UPDATE users SET tier = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [tier, userId]);
  if (balance !== undefined) dbRun("UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [balance, userId]);

  return c.json({ id: userId, updated: true });
});

// DELETE /api/admin/users/:id — deactivate user
admin.delete("/users/:id", (c) => {
  const userId = c.req.param("id");
  dbRun("UPDATE api_keys SET is_active = 0 WHERE user_id = ?", [userId]);
  dbRun("UPDATE users SET tier = 'suspended', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [userId]);
  return c.json({ id: userId, suspended: true });
});

// GET /api/admin/usage — platform-wide usage stats
admin.get("/usage", (c) => {
  const days = parseInt(c.req.query("days") || "7");

  const summary = dbGet(`
    SELECT COUNT(*) as total_requests,
    COALESCE(SUM(cost_usd), 0) as total_revenue,
    COALESCE(SUM(total_tokens), 0) as total_tokens,
    COALESCE(AVG(latency_ms), 0) as avg_latency,
    COUNT(DISTINCT user_id) as active_users
    FROM usage_logs WHERE created_at > datetime('now', '-' || ? || ' days')
  `, [days]);

  const byModel = dbAll(`
    SELECT model_id, provider_id, COUNT(*) as requests, SUM(cost_usd) as revenue,
    SUM(total_tokens) as tokens, AVG(latency_ms) as avg_latency
    FROM usage_logs WHERE created_at > datetime('now', '-' || ? || ' days')
    GROUP BY model_id ORDER BY revenue DESC LIMIT 20
  `, [days]);

  const byProvider = dbAll(`
    SELECT provider_id, COUNT(*) as requests, SUM(cost_usd) as revenue,
    SUM(total_tokens) as tokens
    FROM usage_logs WHERE created_at > datetime('now', '-' || ? || ' days')
    GROUP BY provider_id ORDER BY revenue DESC
  `, [days]);

  const dailyTrend = dbAll(`
    SELECT date(created_at) as date, COUNT(*) as requests, SUM(cost_usd) as revenue
    FROM usage_logs WHERE created_at > datetime('now', '-' || ? || ' days')
    GROUP BY date(created_at) ORDER BY date
  `, [days]);

  return c.json({ period_days: days, summary, by_model: byModel, by_provider: byProvider, daily_trend: dailyTrend });
});

// GET /api/admin/models — manage models
admin.get("/models", (c) => {
  const models = dbAll("SELECT * FROM models ORDER BY provider_id, id");
  return c.json({ object: "list", data: models });
});

// PUT /api/admin/models/:id — update model
admin.put("/models/:id", async (c) => {
  const modelId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const { pricing_input, pricing_output, is_active, context_length } = body;

  const model = dbGet("SELECT id FROM models WHERE id = ?", [modelId]);
  if (!model) return c.json({ error: "Model not found" }, 404);

  if (pricing_input !== undefined) dbRun("UPDATE models SET pricing_input = ? WHERE id = ?", [pricing_input, modelId]);
  if (pricing_output !== undefined) dbRun("UPDATE models SET pricing_output = ? WHERE id = ?", [pricing_output, modelId]);
  if (is_active !== undefined) dbRun("UPDATE models SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, modelId]);
  if (context_length !== undefined) dbRun("UPDATE models SET context_length = ? WHERE id = ?", [context_length, modelId]);

  // Bust the /v1/models response cache so the change is visible immediately.
  invalidateByTag("models");

  return c.json({ id: modelId, updated: true });
});

// GET /api/admin/providers — list providers with status
admin.get("/providers", (c) => {
  const providers = dbAll("SELECT * FROM providers ORDER BY priority");
  const loaded = getProviderMap();
  const enriched = providers.map((p: any) => ({
    ...p,
    is_loaded: loaded.has(p.id),
    model_count: dbGet("SELECT COUNT(*) as count FROM models WHERE provider_id = ?", [p.id])?.count || 0,
  }));
  return c.json({ object: "list", data: enriched });
});

// GET /api/admin/health — system health
admin.get("/health", (c) => {
  const loaded = getProviderMap();
  const userCount = dbGet("SELECT COUNT(*) as count FROM users")?.count || 0;
  const keyCount = dbGet("SELECT COUNT(*) as count FROM api_keys WHERE is_active = 1")?.count || 0;
  const modelCount = dbGet("SELECT COUNT(*) as count FROM models WHERE is_active = 1")?.count || 0;
  const totalRequests = dbGet("SELECT COUNT(*) as count FROM usage_logs")?.count || 0;
  const totalRevenue = dbGet("SELECT COALESCE(SUM(cost_usd), 0) as sum FROM usage_logs")?.sum || 0;

  return c.json({
    status: "ok",
    uptime_seconds: Math.round(process.uptime()),
    memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    providers_loaded: loaded.size,
    providers_available: Array.from(loaded.keys()),
    users: userCount,
    api_keys: keyCount,
    models: modelCount,
    total_requests: totalRequests,
    total_revenue: Math.round(totalRevenue * 100) / 100,
  });
});

export default admin;
