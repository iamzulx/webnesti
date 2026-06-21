import { Hono } from "hono";
import { dbAll, dbGet, dbRun } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";

const budget = new Hono();
budget.use("*", authMiddleware);

// GET /api/budget — get current user's budget settings
budget.get("/", (c) => {
  const user = c.get("user");
  const apiKey = c.get("apiKey");

  const monthlySpend = dbGet(`
    SELECT COALESCE(SUM(cost_usd), 0) as total
    FROM usage_logs WHERE user_id = ? AND created_at > datetime('now', 'start of month')
  `, [user.id]);

  const dailySpend = dbGet(`
    SELECT COALESCE(SUM(cost_usd), 0) as total
    FROM usage_logs WHERE user_id = ? AND created_at > datetime('now', '-1 day')
  `, [user.id]);

  return c.json({
    user_id: user.id,
    balance: user.balance,
    tier: user.tier,
    monthly_spend: monthlySpend?.total || 0,
    daily_spend: dailySpend?.total || 0,
    monthly_budget: apiKey.monthly_budget || null,
    rate_limit: apiKey.rate_limit,
    daily_limit: apiKey.daily_limit,
  });
});

// PUT /api/budget — update budget limits
budget.put("/", async (c) => {
  const apiKey = c.get("apiKey");
  const body = await c.req.json().catch(() => ({}));
  const { monthly_budget, daily_limit, rate_limit } = body;

  if (monthly_budget !== undefined) dbRun("UPDATE api_keys SET monthly_budget = ? WHERE id = ?", [monthly_budget, apiKey.id]);
  if (daily_limit !== undefined) dbRun("UPDATE api_keys SET daily_limit = ? WHERE id = ?", [daily_limit, apiKey.id]);
  if (rate_limit !== undefined) dbRun("UPDATE api_keys SET rate_limit = ? WHERE id = ?", [rate_limit, apiKey.id]);

  return c.json({ updated: true, monthly_budget, daily_limit, rate_limit });
});

// GET /api/budget/alerts — get spending alerts
budget.get("/alerts", (c) => {
  const user = c.get("user");
  const apiKey = c.get("apiKey");
  const alerts = [];

  if (user.balance < 1) {
    alerts.push({ level: "critical", message: "Balance below $1. Please top up.", type: "low_balance" });
  } else if (user.balance < 5) {
    alerts.push({ level: "warning", message: "Balance below $5.", type: "low_balance" });
  }

  const monthlySpend = dbGet(`
    SELECT COALESCE(SUM(cost_usd), 0) as total
    FROM usage_logs WHERE user_id = ? AND created_at > datetime('now', 'start of month')
  `, [user.id]);

  if (apiKey.monthly_budget && monthlySpend?.total > apiKey.monthly_budget * 0.8) {
    const pct = Math.round((monthlySpend.total / apiKey.monthly_budget) * 100);
    alerts.push({ level: "warning", message: `Monthly spend at ${pct}% of budget.`, type: "budget_threshold" });
  }

  const dailyRequests = dbGet(`
    SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND created_at > datetime('now', '-1 day')
  `, [user.id]);

  if (dailyRequests?.count > apiKey.daily_limit * 0.9) {
    alerts.push({ level: "warning", message: `Daily requests at ${dailyRequests.count}/${apiKey.daily_limit}.`, type: "daily_limit" });
  }

  return c.json({ alerts, monthly_spend: monthlySpend?.total || 0, daily_requests: dailyRequests?.count || 0 });
});

export default budget;
