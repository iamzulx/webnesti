import { Hono } from "hono";
import { dbGet, dbRun, dbAll } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { randomBytes } from "crypto";

const monetization = new Hono();
monetization.use("*", authMiddleware);

// --- Pricing Tiers ---
const TIERS: Record<string, { markup: number; minTopup: number; rateLimit: number; dailyLimit: number; features: string[] }> = {
  free:       { markup: 0,    minTopup: 0,   rateLimit: 20,  dailyLimit: 1000,  features: ["Limited models", "Basic support", "No SLA"] },
  starter:    { markup: 10,   minTopup: 5,   rateLimit: 60,  dailyLimit: 10000, features: ["All models", "Standard support", "Usage analytics"] },
  pro:        { markup: 5,    minTopup: 50,  rateLimit: 300, dailyLimit: 100000, features: ["Priority routing", "Advanced analytics", "Webhooks", "BYOK"] },
  enterprise: { markup: 0,    minTopup: 500, rateLimit: 0,   dailyLimit: 0,     features: ["Custom pricing", "Dedicated support", "SLA", "White-label", "Admin panel"] },
};

// GET /api/pricing — list all tiers
monetization.get("/pricing", (c) => {
  const tiers = Object.entries(TIERS).map(([name, config]) => ({
    name,
    markup_percent: config.markup,
    min_topup_usd: config.minTopup,
    rate_limit_per_min: config.rateLimit || "unlimited",
    daily_limit: config.dailyLimit || "unlimited",
    features: config.features,
  }));
  return c.json({ tiers });
});

// GET /api/pricing/current — current user's tier
monetization.get("/pricing/current", (c) => {
  const user = c.get("user");
  const tier = TIERS[user.tier] || TIERS.free;
  return c.json({
    tier: user.tier,
    markup_percent: tier.markup,
    rate_limit: tier.rateLimit,
    daily_limit: tier.dailyLimit,
    features: tier.features,
    balance: user.balance,
  });
});

// POST /api/pricing/upgrade — upgrade tier
monetization.post("/pricing/upgrade", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const { tier } = body;

  if (!tier || !TIERS[tier]) {
    return c.json({ error: "Invalid tier. Choose: free, starter, pro, enterprise" }, 400);
  }

  const target = TIERS[tier];
  const currentTierIndex = Object.keys(TIERS).indexOf(user.tier);
  const targetTierIndex = Object.keys(TIERS).indexOf(tier);

  if (targetTierIndex <= currentTierIndex) {
    return c.json({ error: "Can only upgrade to a higher tier" }, 400);
  }

  if (user.balance < target.minTopup) {
    return c.json({ error: `Minimum balance for ${tier} is $${target.minTopup}. Current: $${user.balance}` }, 402);
  }

  // Update user tier + API key limits
  dbRun("UPDATE users SET tier = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [tier, user.id]);
  dbRun("UPDATE api_keys SET rate_limit = ?, daily_limit = ? WHERE user_id = ?", [target.rateLimit, target.dailyLimit, user.id]);

  return c.json({
    upgraded: true,
    from: user.tier,
    to: tier,
    new_limits: { rate_limit: target.rateLimit, daily_limit: target.dailyLimit },
    features: target.features,
  });
});

// --- Referral System ---
// GET /api/referral — get referral code
monetization.get("/referral", (c) => {
  const user = c.get("user");

  // Get or create referral code
  let referral = dbGet("SELECT * FROM referrals WHERE user_id = ?", [user.id]);
  if (!referral) {
    const code = "WN-" + randomBytes(4).toString("hex").toUpperCase();
    dbRun("INSERT INTO referrals (id, user_id, code, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
      [randomBytes(8).toString("hex"), user.id, code]);
    referral = { code, user_id: user.id, referrals_count: 0, total_earned: 0 };
  }

  // Count referrals
  const count = dbGet("SELECT COUNT(*) as count FROM referral_uses WHERE referrer_id = ?", [user.id]);
  const earned = dbGet("SELECT COALESCE(SUM(credit_amount), 0) as total FROM referral_uses WHERE referrer_id = ?", [user.id]);

  return c.json({
    code: referral.code,
    referral_link: `https://webnesti.ai/signup?ref=${referral.code}`,
    referrals_count: count?.count || 0,
    total_earned: earned?.total || 0,
    reward_per_referral: 5, // $5 credit per referral
  });
});

// POST /api/referral/apply — apply referral code during signup
monetization.post("/referral/apply", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const { code } = body;

  if (!code) return c.json({ error: "Referral code required" }, 400);

  // Check if user already used a referral
  const existing = dbGet("SELECT id FROM referral_uses WHERE referred_id = ?", [user.id]);
  if (existing) return c.json({ error: "Already used a referral code" }, 409);

  // Find referrer
  const referral = dbGet("SELECT * FROM referrals WHERE code = ?", [code]);
  if (!referral) return c.json({ error: "Invalid referral code" }, 404);
  if (referral.user_id === user.id) return c.json({ error: "Cannot refer yourself" }, 400);

  // Apply referral
  const useId = randomBytes(8).toString("hex");
  dbRun("INSERT INTO referral_uses (id, referrer_id, referred_id, code, credit_amount, created_at) VALUES (?, ?, ?, ?, 5, CURRENT_TIMESTAMP)",
    [useId, referral.user_id, user.id, code]);

  // Credit both users
  dbRun("UPDATE users SET balance = balance + 5 WHERE id = ?", [referral.user_id]); // Referrer gets $5
  dbRun("UPDATE users SET balance = balance + 2 WHERE id = ?", [user.id]); // Referred gets $2

  return c.json({
    applied: true,
    referrer_bonus: 5,
    referred_bonus: 2,
    message: "Referral applied! You got $2 credit.",
  });
});

// GET /api/referral/leaderboard — top referrers
monetization.get("/referral/leaderboard", (c) => {
  const top = dbAll(`
    SELECT u.name, u.email, COUNT(ru.id) as referrals, SUM(ru.credit_amount) as earned
    FROM referrals r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN referral_uses ru ON ru.referrer_id = r.user_id
    GROUP BY r.user_id
    ORDER BY referrals DESC
    LIMIT 10
  `);
  return c.json({ leaderboard: top });
});

// --- BYOK (Bring Your Own Key) ---
// POST /api/byok — register user's own API key
monetization.post("/byok", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const { provider, api_key } = body;

  if (!provider || !api_key) return c.json({ error: "provider and api_key required" }, 400);

  // Store BYOK key (encrypted in production)
  const id = randomBytes(8).toString("hex");
  dbRun("INSERT INTO byok_keys (id, user_id, provider, key_hash, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
    [id, user.id, provider, api_key]); // In production: encrypt the key

  return c.json({
    id,
    provider,
    status: "active",
    message: "BYOK key registered. Requests using this provider will use your key (0% markup).",
  });
});

// GET /api/byok — list user's BYOK keys
monetization.get("/byok", (c) => {
  const user = c.get("user");
  const keys = dbAll("SELECT id, provider, created_at FROM byok_keys WHERE user_id = ?", [user.id]);
  return c.json({ keys });
});

// DELETE /api/byok/:id — remove BYOK key
monetization.delete("/byok/:id", (c) => {
  const user = c.get("user");
  const keyId = c.req.param("id");
  dbRun("DELETE FROM byok_keys WHERE id = ? AND user_id = ?", [keyId, user.id]);
  return c.json({ id: keyId, deleted: true });
});

// --- Cost Calculator ---
// GET /api/calculate — estimate cost for a request
monetization.get("/calculate", (c) => {
  const user = c.get("user");
  const modelId = c.req.query("model");
  const inputTokens = parseInt(c.req.query("input_tokens") || "1000");
  const outputTokens = parseInt(c.req.query("output_tokens") || "500");

  if (!modelId) return c.json({ error: "model query param required" }, 400);

  const model = dbGet("SELECT * FROM models WHERE id = ?", [modelId]);
  if (!model) return c.json({ error: "Model not found" }, 404);

  const tier = TIERS[user.tier] || TIERS.free;
  const markup = tier.markup / 100;

  const inputCost = inputTokens * model.pricing_input;
  const outputCost = outputTokens * model.pricing_output;
  const baseCost = inputCost + outputCost;
  const totalCost = baseCost * (1 + markup);

  return c.json({
    model: modelId,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    pricing: {
      input_per_token: model.pricing_input,
      output_per_token: model.pricing_output,
    },
    cost: {
      base_usd: Math.round(baseCost * 1000000) / 1000000,
      markup_percent: tier.markup,
      total_usd: Math.round(totalCost * 1000000) / 1000000,
    },
    balance_after: Math.round((user.balance - totalCost) * 100) / 100,
    affordable: user.balance >= totalCost,
  });
});

export default monetization;
