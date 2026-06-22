/** @jsxImportSource hono/jsx */
import { Hono } from "hono";
import { dbAll, dbGet } from "../db/index.js";
import { hashApiKey } from "../encryption.js";
import { config } from "../config.js";
import { parse } from "cookie";
import jwt from "jsonwebtoken";
import { Layout, Fragment } from "../views/Layout.js";
import { DashboardPage } from "../views/pages/Dashboard.js";
import { ModelsPage } from "../views/pages/Models.js";
import { AuthPage } from "../views/pages/Auth.js";
import { KeysPage } from "../views/pages/Keys.js";
import { UsagePage } from "../views/pages/Usage.js";
import { BillingPage } from "../views/pages/Billing.js";
import { BudgetPage } from "../views/pages/Budget.js";
import { PricingPage } from "../views/pages/Pricing.js";
import { PlaygroundPage } from "../views/pages/Playground.js";
import { ReferralPage } from "../views/pages/Referral.js";
import { BYOKPage } from "../views/pages/BYOK.js";

const views = new Hono();

// Helper: extract user from JWT cookie or API key header
function getUserFromContext(c: any) {
  try {
    const authHeader = c.req.header("Authorization");
    if (authHeader) {
      const key = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
      if (key.startsWith("wn_")) {
        const keyHash = hashApiKey(key);
        const apiKey = dbGet("SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1", [keyHash]);
        if (apiKey) return dbGet("SELECT * FROM users WHERE id = ?", [apiKey.user_id]);
      }
    }
    const cookieHeader = c.req.header("cookie") || "";
    const cookies = parse(cookieHeader);
    const token = cookies["session"];
    if (token) {
      const payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
      if (typeof payload !== "string") {
        return dbGet("SELECT id, email, name, balance, tier FROM users WHERE id = ?", [payload.sub]);
      }
    }
  } catch {}
  return null;
}

// Helper: render full or fragment based on HX-Request
function renderPage(c: any, title: string, activePage: string, user: any, content: any) {
  const hx = c.req.header("HX-Request");
  if (hx) return c.html(<Fragment>{content}</Fragment>);
  return c.html(<Layout title={title} activePage={activePage} user={user}>{content}</Layout>);
}

// --- Auth (no sidebar) ---
views.get("/auth", (c) => {
  return c.html(
    <html lang="en" class="dark">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>WebNesti — Login</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect rx='20' width='100' height='100' fill='%230ea5e9'/><text x='50' y='70' font-size='60' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='bold'>W</text></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="/js/alpine.min.js" defer></script>
        <script src="/js/app.js"></script>
        <script dangerouslySetInnerHTML={{ __html: `
tailwind.config = { darkMode: 'class', theme: { extend: { fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }, colors: { accent: { 50:'#f0f9ff',100:'#e0f2fe',200:'#bae6fd',300:'#7dd3fc',400:'#38bdf8',500:'#0ea5e9',600:'#0284c7',700:'#0369a1',800:'#075985',900:'#0c4a6e',950:'#082f49' } } } } }` }} />
        <style dangerouslySetInnerHTML={{ __html: `
body{font-family:'Inter',system-ui,sans-serif;background:#030712;color:#e5e7eb}
.card{background:#0f172a;border:1px solid #1f2937;border-radius:12px;padding:20px}
.btn-primary{background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;border-radius:10px;padding:10px 24px;font-weight:600;border:none;cursor:pointer;transition:all .2s}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 25px rgba(14,165,233,0.3)}
.btn-primary:disabled{opacity:.5;cursor:not-allowed}
input,select{background:#0f172a;border:1px solid #1f2937;color:#e5e7eb;border-radius:10px;padding:10px 14px;font-size:14px;outline:none;width:100%}
input:focus,select:focus{border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,0.1)}
/* Toast notifications */
.toast-container{position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:400px;width:calc(100% - 40px);pointer-events:none}
.toast{pointer-events:all;padding:14px 18px;border-radius:10px;font-size:14px;font-weight:500;display:flex;align-items:flex-start;gap:10px;animation:toast-in .3s ease-out forwards;box-shadow:0 4px 20px rgba(0,0,0,0.3)}
.toast.removing{animation:toast-out .3s ease-in forwards}
.toast-success{background:#065f46;border:1px solid #10b981;color:#6ee7b7}
.toast-error{background:#7f1d1d;border:1px solid #ef4444;color:#fca5a5}
.toast-warning{background:#78350f;border:1px solid #f59e0b;color:#fcd34d}
.toast-info{background:#1e3a5f;border:1px solid #0ea5e9;color:#7dd3fc}
.toast-icon{font-size:18px;flex-shrink:0;line-height:1}
.toast-close{margin-left:auto;cursor:pointer;opacity:.6;font-size:16px;flex-shrink:0}
.toast-close:hover{opacity:1}
@keyframes toast-in{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}
@keyframes toast-out{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(100%)}}
` }} />
      </head>
      <body>
        <div id="toast-container" class="toast-container"></div>
        <AuthPage />
      </body>
    </html>
  );
});

// --- Dashboard ---
views.get("/dashboard", (c) => {
  const user = getUserFromContext(c);
  const stats = dbGet(`
    SELECT COUNT(*) as total_requests, COALESCE(SUM(total_tokens), 0) as total_tokens,
    COALESCE(SUM(cost_usd), 0) as total_cost, COALESCE(AVG(latency_ms), 0) as avg_latency
    FROM usage_logs ${user ? "WHERE user_id = ?" : ""}
  `, user ? [user.id] : []) || { total_requests: 0, total_tokens: 0, total_cost: 0, avg_latency: 0 };

  const recentModels = dbAll(`
    SELECT model_id, COUNT(*) as requests, SUM(cost_usd) as cost
    FROM usage_logs ${user ? "WHERE user_id = ?" : ""}
    GROUP BY model_id ORDER BY requests DESC LIMIT 10
  `, user ? [user.id] : []);

  return renderPage(c, "Dashboard", "dashboard", user,
    <DashboardPage data={{
      user: user || { email: "guest", balance: 0, tier: "free" },
      stats,
      recentModels,
    }} />
  );
});

// --- Models ---
views.get("/models", (c) => {
  const user = getUserFromContext(c);
  const models = dbAll("SELECT * FROM models WHERE is_active = 1 ORDER BY provider_id, id");
  const providers = [...new Set(models.map((m: any) => m.provider_id))] as string[];
  return renderPage(c, "Models", "models", user,
    <ModelsPage models={models} providers={providers} />
  );
});

// --- Playground ---
views.get("/playground", (c) => {
  const user = getUserFromContext(c);
  const models = dbAll("SELECT id, provider_id, display_name, pricing_input, pricing_output FROM models WHERE is_active = 1 ORDER BY provider_id, id");
  return renderPage(c, "Playground", "playground", user,
    <PlaygroundPage models={models} />
  );
});

// --- API Keys ---
views.get("/keys", (c) => {
  const user = getUserFromContext(c);
  const keys = user ? dbAll("SELECT id, key_prefix, name, rate_limit, daily_limit, is_active, created_at FROM api_keys WHERE user_id = ?", [user.id]) : [];
  return renderPage(c, "API Keys", "keys", user,
    <KeysPage keys={keys} />
  );
});

// --- Usage ---
views.get("/usage", (c) => {
  const user = getUserFromContext(c);
  const where = user ? "WHERE user_id = ?" : "";
  const params = user ? [user.id] : [];
  const summary = dbGet(`
    SELECT COUNT(*) as total_requests, COALESCE(SUM(prompt_tokens), 0) as total_prompt_tokens,
    COALESCE(SUM(completion_tokens), 0) as total_completion_tokens,
    COALESCE(SUM(total_tokens), 0) as total_tokens, COALESCE(SUM(cost_usd), 0) as total_cost,
    COALESCE(AVG(latency_ms), 0) as avg_latency FROM usage_logs ${where}
  `, params) || {};
  const byModel = dbAll(`
    SELECT model_id, provider_id, COUNT(*) as requests, SUM(prompt_tokens) as prompt_tokens,
    SUM(completion_tokens) as completion_tokens, SUM(total_tokens) as total_tokens,
    SUM(cost_usd) as cost, AVG(latency_ms) as avg_latency
    FROM usage_logs ${where} GROUP BY model_id ORDER BY cost DESC
  `, params);
  const recent = dbAll("SELECT * FROM usage_logs " + where + " ORDER BY created_at DESC LIMIT 50", params);
  return renderPage(c, "Usage", "usage", user,
    <UsagePage summary={summary} byModel={byModel} recent={recent} />
  );
});

// --- Billing ---
views.get("/billing", (c) => {
  const user = getUserFromContext(c);
  const balance = user?.balance || 0;
  const transactions = user ? dbAll("SELECT * FROM billing_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100", [user.id]) : [];
  return renderPage(c, "Billing", "billing", user,
    <BillingPage balance={balance} transactions={transactions} />
  );
});

// --- Budget ---
views.get("/budget", (c) => {
  const user = getUserFromContext(c);
  if (!user) return renderPage(c, "Budget", "budget", null, <div><p>Login required</p></div>);

  const monthlySpend = dbGet(`SELECT COALESCE(SUM(cost_usd), 0) as total FROM usage_logs WHERE user_id = ? AND created_at > datetime('now', 'start of month')`, [user.id]);
  const dailySpend = dbGet(`SELECT COALESCE(SUM(cost_usd), 0) as total FROM usage_logs WHERE user_id = ? AND created_at > datetime('now', '-1 day')`, [user.id]);
  const apiKey = dbGet("SELECT monthly_budget, rate_limit, daily_limit FROM api_keys WHERE user_id = ? AND is_active = 1", [user.id]);

  const alerts: Array<{ level: string; message: string; type: string }> = [];
  if (user.balance < 1) alerts.push({ level: "critical", message: "Balance below $1. Please top up.", type: "low_balance" });
  else if (user.balance < 5) alerts.push({ level: "warning", message: "Balance below $5.", type: "low_balance" });
  if (apiKey?.monthly_budget && monthlySpend?.total > apiKey.monthly_budget * 0.8) {
    const pct = Math.round((monthlySpend.total / apiKey.monthly_budget) * 100);
    alerts.push({ level: "warning", message: `Monthly spend at ${pct}% of budget.`, type: "budget_threshold" });
  }

  return renderPage(c, "Budget", "budget", user,
    <BudgetPage data={{
      balance: user.balance, tier: user.tier,
      monthly_spend: monthlySpend?.total || 0, daily_spend: dailySpend?.total || 0,
      monthly_budget: apiKey?.monthly_budget || null,
      rate_limit: apiKey?.rate_limit || 60, daily_limit: apiKey?.daily_limit || 10000,
      alerts,
    }} />
  );
});

// --- Pricing ---
const TIERS: Record<string, { markup: number; minTopup: number; rateLimit: number; dailyLimit: number; features: string[] }> = {
  free: { markup: 0, minTopup: 0, rateLimit: 20, dailyLimit: 1000, features: ["Limited models", "Basic support", "No SLA"] },
  starter: { markup: 10, minTopup: 5, rateLimit: 60, dailyLimit: 10000, features: ["All models", "Standard support", "Usage analytics"] },
  pro: { markup: 5, minTopup: 50, rateLimit: 300, dailyLimit: 100000, features: ["Priority routing", "Advanced analytics", "Webhooks", "BYOK"] },
  enterprise: { markup: 0, minTopup: 500, rateLimit: 0, dailyLimit: 0, features: ["Custom pricing", "Dedicated support", "SLA", "White-label", "Admin panel"] },
};

views.get("/pricing", (c) => {
  const user = getUserFromContext(c);
  const tiers = Object.entries(TIERS).map(([name, t]) => ({
    name, markup_percent: t.markup, min_topup_usd: t.minTopup,
    rate_limit_per_min: t.rateLimit || "unlimited", daily_limit: t.dailyLimit || "unlimited",
    features: t.features,
  }));
  const currentTier = user ? { tier: user.tier, markup_percent: TIERS[user.tier]?.markup || 0, rate_limit: TIERS[user.tier]?.rateLimit, daily_limit: TIERS[user.tier]?.dailyLimit } : null;
  return renderPage(c, "Pricing", "pricing", user,
    <PricingPage tiers={tiers} currentTier={currentTier} />
  );
});

// --- Referral ---
views.get("/referral", (c) => {
  const user = getUserFromContext(c);
  let data: any = { code: "", referral_link: "", referrals_count: 0, total_earned: 0, reward_per_referral: 5, leaderboard: [] };
  if (user) {
    const referral = dbGet("SELECT * FROM referrals WHERE user_id = ?", [user.id]);
    const count = dbGet("SELECT COUNT(*) as count FROM referral_uses WHERE referrer_id = ?", [user.id]);
    const earned = dbGet("SELECT COALESCE(SUM(credit_amount), 0) as total FROM referral_uses WHERE referrer_id = ?", [user.id]);
    const leaderboard = dbAll(`
      SELECT u.name, COUNT(ru.id) as referrals, SUM(ru.credit_amount) as earned
      FROM referrals r JOIN users u ON r.user_id = u.id LEFT JOIN referral_uses ru ON ru.referrer_id = r.user_id
      GROUP BY r.user_id ORDER BY referrals DESC LIMIT 10
    `);
    data = {
      code: referral?.code || "",
      referral_link: referral?.code ? `https://webnesti.ai/signup?ref=${referral.code}` : "",
      referrals_count: count?.count || 0,
      total_earned: earned?.total || 0,
      reward_per_referral: 5,
      leaderboard,
    };
  }
  return renderPage(c, "Referral", "referral", user,
    <ReferralPage data={data} />
  );
});

// --- BYOK ---
views.get("/byok", (c) => {
  const user = getUserFromContext(c);
  const keys = user ? dbAll("SELECT id, provider, key_prefix, created_at FROM byok_keys WHERE user_id = ?", [user.id]) : [];
  return renderPage(c, "BYOK", "byok", user,
    <BYOKPage keys={keys} />
  );
});

// --- Health ---
views.get("/health", (c) => {
  const models = dbGet("SELECT COUNT(*) as count FROM models WHERE is_active = 1");
  const users = dbGet("SELECT COUNT(*) as count FROM users");
  return renderPage(c, "Health", "", null,
    <div>
      <h2 style="font-size:24px;font-weight:700;margin-bottom:16px">System Health</h2>
      <div class="card" style="display:grid;gap:12px">
        <div style="display:flex;justify-content:space-between"><span style="color:#9ca3af">Status</span><span style="color:#10b981;font-weight:600">✅ Operational</span></div>
        <div style="display:flex;justify-content:space-between"><span style="color:#9ca3af">Active Models</span><span style="font-weight:600">{models?.count || 0}</span></div>
        <div style="display:flex;justify-content:space-between"><span style="color:#9ca3af">Registered Users</span><span style="font-weight:600">{users?.count || 0}</span></div>
        <div style="display:flex;justify-content:space-between"><span style="color:#9ca3af">Uptime</span><span style="font-weight:600">{Math.round(process.uptime() / 60)} minutes</span></div>
      </div>
    </div>
  );
});

export default views;
