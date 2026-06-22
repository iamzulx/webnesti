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

const views = new Hono();

// Helper: extract user from JWT cookie or API key header
function getUserFromContext(c: any) {
  try {
    // Try API key auth first
    const authHeader = c.req.header("Authorization");
    if (authHeader) {
      const key = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
      if (key.startsWith("wn_")) {
        const keyHash = hashApiKey(key);
        const apiKey = dbGet("SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1", [keyHash]);
        if (apiKey) {
          return dbGet("SELECT * FROM users WHERE id = ?", [apiKey.user_id]);
        }
      }
    }

    // Try JWT cookie
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

// --- Dashboard (full page + htmx fragment) ---
views.get("/dashboard", (c) => {
  const user = getUserFromContext(c);
  const hxRequest = c.req.header("HX-Request");
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

  const content = (
    <DashboardPage data={{
      user: user || { email: "guest", balance: 0, tier: "free" },
      stats,
      recentModels,
    }} />
  );

  // htmx fragment swap — return just the content
  if (hxRequest) return c.html(<Fragment>{content}</Fragment>);
  // Full page load — wrap in layout
  return c.html(<Layout title="Dashboard" activePage="dashboard" user={user}>{content}</Layout>);
});

// --- Models page ---
views.get("/models", (c) => {
  const user = getUserFromContext(c);
  const models = dbAll("SELECT * FROM models WHERE is_active = 1 ORDER BY provider_id, id");
  const providers = [...new Set(models.map((m: any) => m.provider_id))] as string[];
  const hxRequest = c.req.header("HX-Request");

  if (hxRequest) {
    return c.html(
      <Fragment>
        <ModelsPage models={models} providers={providers} />
      </Fragment>
    );
  }

  return c.html(
    <Layout title="Models" activePage="models" user={user}>
      <ModelsPage models={models} providers={providers} />
    </Layout>
  );
});

// --- Health page (simple) ---
views.get("/health", (c) => {
  const models = dbGet("SELECT COUNT(*) as count FROM models WHERE is_active = 1");
  const users = dbGet("SELECT COUNT(*) as count FROM users");

  return c.html(
    <Layout title="Health" activePage="">
      <div>
        <h2 style="font-size:24px;font-weight:700;margin-bottom:16px">System Health</h2>
        <div class="card" style="display:grid;gap:12px">
          <div style="display:flex;justify-content:space-between">
            <span style="color:#9ca3af">Status</span>
            <span style="color:#10b981;font-weight:600">✅ Operational</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:#9ca3af">Active Models</span>
            <span style="font-weight:600">{models?.count || 0}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:#9ca3af">Registered Users</span>
            <span style="font-weight:600">{users?.count || 0}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:#9ca3af">Uptime</span>
            <span style="font-weight:600">{Math.round(process.uptime() / 60)} minutes</span>
          </div>
        </div>
      </div>
    </Layout>
  );
});

export default views;
