import { Hono } from "hono";
import { dbGet, dbRun } from "../db/index.js";
import { monthlySpendByUser, dailySpendByUser, dailyRequestsByUser } from "../db/queries.js";
import { authMiddleware } from "../middleware/auth.js";

const budget = new Hono();
budget.use("*", authMiddleware);

// GET /api/budget — get current user's budget settings
budget.get("/", (c) => {
  const user = c.get("user");
  const apiKey = c.get("apiKey");

  return c.json({
    user_id: user.id,
    balance: user.balance,
    tier: user.tier,
    monthly_spend: monthlySpendByUser(user.id),
    daily_spend: dailySpendByUser(user.id),
    monthly_budget: apiKey.monthly_budget || null,
    rate_limit: apiKey.rate_limit,
    daily_limit: apiKey.daily_limit,
  });
});

// PUT /api/budget — update budget limits
// NOTE: rate_limit and daily_limit are NOT user-editable here. They are governed
// by the user's tier (see monetization upgrade). Allowing clients to set them would
// let any user raise their own quota and defeat the per-tier rate limiter. Only the
// self-imposed monthly_budget (a soft spend cap) can be set here.
budget.put("/", async (c) => {
  const apiKey = c.get("apiKey");
  const body = await c.req.json().catch(() => ({}));
  const { monthly_budget } = body;

  if (monthly_budget !== undefined && monthly_budget !== null) {
    if (typeof monthly_budget !== "number" || !Number.isFinite(monthly_budget) || monthly_budget < 0) {
      return c.json({ error: "monthly_budget must be a non-negative number or null" }, 400);
    }
  }

  if (monthly_budget !== undefined) {
    dbRun("UPDATE api_keys SET monthly_budget = ? WHERE id = ?", [monthly_budget, apiKey.id]);
  }

  return c.json({ updated: true, monthly_budget });
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

  const monthlySpend = monthlySpendByUser(user.id);

  if (apiKey.monthly_budget && monthlySpend > apiKey.monthly_budget * 0.8) {
    const pct = Math.round((monthlySpend / apiKey.monthly_budget) * 100);
    alerts.push({ level: "warning", message: `Monthly spend at ${pct}% of budget.`, type: "budget_threshold" });
  }

  const dailyRequests = dailyRequestsByUser(user.id);

  if (dailyRequests > apiKey.daily_limit * 0.9) {
    alerts.push({ level: "warning", message: `Daily requests at ${dailyRequests}/${apiKey.daily_limit}.`, type: "daily_limit" });
  }

  return c.json({ alerts, monthly_spend: monthlySpend, daily_requests: dailyRequests });
});

export default budget;
