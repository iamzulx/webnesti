import { Hono } from "hono";
import { dbAll, dbGet } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";

const dashboard = new Hono();

function htmlPage(title: string, body: string, css: string = ""): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — WebNesti</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0f;color:#e2e8f0;min-height:100vh}
.nav{background:#111827;padding:12px 24px;display:flex;gap:16px;border-bottom:1px solid #1f2937}
.nav a{color:#93c5fd;text-decoration:none;font-size:14px}.nav a:hover{color:#60a5fa}
.nav .brand{font-weight:700;color:#f9fafb;font-size:16px;margin-right:auto}
.container{max-width:960px;margin:0 auto;padding:24px}
.card{background:#111827;border:1px solid #1f2937;border-radius:8px;padding:20px;margin-bottom:16px}
.card h2{font-size:14px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
.card .value{font-size:28px;font-weight:700;color:#f9fafb}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
table{width:100%;border-collapse:collapse;font-size:14px}
th{text-align:left;padding:8px;color:#9ca3af;border-bottom:1px solid #1f2937}
td{padding:8px;border-bottom:1px solid #1f2937}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px}
.badge-green{background:#064e3b;color:#6ee7b7}.badge-blue{background:#1e3a5f;color:#93c5fd}
.badge-yellow{background:#713f12;color:#fcd34d}
.btn{display:inline-block;padding:8px 16px;border-radius:6px;font-size:14px;cursor:pointer;border:none}
.btn-primary{background:#3b82f6;color:white}.btn-primary:hover{background:#2563eb}
${css}</style>
</head><body>
<div class="nav">
  <span class="brand">⚡ WebNesti</span>
  <a href="/dashboard">Overview</a>
  <a href="/dashboard/keys">API Keys</a>
  <a href="/dashboard/usage">Usage</a>
  <a href="/dashboard/billing">Billing</a>
  <a href="/dashboard/pricing">Pricing</a>
  <a href="/api/auth/logout" style="color:#f87171">Logout</a>
</div>
<div class="container">${body}</div>
</body></html>`;
}

// GET /dashboard — overview (requires auth via query param for browser)
dashboard.get("/", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.redirect("/dashboard/login");

  const user = dbGet("SELECT * FROM users WHERE id = (SELECT user_id FROM api_keys WHERE key_hash = ? LIMIT 1)", [token])
    || dbGet("SELECT * FROM users WHERE id = ?", [token]);
  if (!user) return htmlPage("Unauthorized", `<p>Please <a href="/dashboard/login">login</a></p>`);

  const stats = dbGet(`SELECT COUNT(*) as req, COALESCE(SUM(total_tokens),0) as tokens, COALESCE(SUM(cost_usd),0) as cost FROM usage_logs WHERE user_id=?`, [user.id]);
  const keyCount = dbGet("SELECT COUNT(*) as c FROM api_keys WHERE user_id=? AND is_active=1", [user.id]);

  const body = `
  <h1 style="margin-bottom:16px">Dashboard</h1>
  <p style="color:#9ca3af;margin-bottom:24px">${user.email} · ${user.tier}</p>
  <div class="grid">
    <div class="card"><h2>Balance</h2><div class="value">$${user.balance.toFixed(2)}</div></div>
    <div class="card"><h2>API Keys</h2><div class="value">${keyCount?.c || 0}</div></div>
    <div class="card"><h2>Total Requests</h2><div class="value">${stats?.req || 0}</div></div>
    <div class="card"><h2>Total Tokens</h2><div class="value">${(stats?.tokens || 0).toLocaleString()}</div></div>
  </div>`;

  return c.html(htmlPage("Dashboard", body));
});

// GET /dashboard/keys
dashboard.get("/keys", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.redirect("/dashboard/login");

  const user = dbGet("SELECT * FROM users WHERE id = ?", [token]);
  if (!user) return c.html(htmlPage("Unauthorized", `<p>Login required</p>`));

  const keys = dbAll("SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC", [user.id]);

  const rows = keys.map((k: any) => `<tr>
    <td><code>${k.key_prefix}...</code></td>
    <td>${k.name}</td>
    <td>${k.rate_limit}/min</td>
    <td><span class="badge badge-${k.is_active ? 'green' : 'yellow'}">${k.is_active ? 'Active' : 'Revoked'}</span></td>
    <td>${k.created_at?.slice(0, 10) || '-'}</td>
  </tr>`).join("");

  return c.html(htmlPage("API Keys", `
    <h1 style="margin-bottom:16px">API Keys</h1>
    <table><thead><tr><th>Prefix</th><th>Name</th><th>Rate Limit</th><th>Status</th><th>Created</th></tr></thead>
    <tbody>${rows || '<tr><td colspan=5>No keys</td></tr>'}</tbody></table>
  `));
});

// GET /dashboard/usage
dashboard.get("/usage", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.redirect("/dashboard/login");

  const user = dbGet("SELECT * FROM users WHERE id = ?", [token]);
  if (!user) return c.html(htmlPage("Unauthorized", `<p>Login required</p>`));

  const stats = dbGet(`SELECT COUNT(*) as req, COALESCE(SUM(prompt_tokens),0) as prompt,
    COALESCE(SUM(completion_tokens),0) as comp, COALESCE(SUM(cost_usd),0) as cost,
    COALESCE(AVG(latency_ms),0) as latency FROM usage_logs WHERE user_id=?`, [user.id]);
  const byModel = dbAll(`SELECT model_id, COUNT(*) as req, SUM(cost_usd) as cost, SUM(total_tokens) as tokens
    FROM usage_logs WHERE user_id=? GROUP BY model_id ORDER BY cost DESC`, [user.id]);

  const modelRows = byModel.map((m: any) => `<tr>
    <td>${m.model_id}</td><td>${m.req}</td><td>${(m.tokens||0).toLocaleString()}</td>
    <td>$${(m.cost||0).toFixed(6)}</td>
  </tr>`).join("");

  return c.html(htmlPage("Usage", `
    <h1 style="margin-bottom:16px">Usage Analytics</h1>
    <div class="grid">
      <div class="card"><h2>Requests</h2><div class="value">${stats?.req || 0}</div></div>
      <div class="card"><h2>Prompt Tokens</h2><div class="value">${(stats?.prompt||0).toLocaleString()}</div></div>
      <div class="card"><h2>Completion Tokens</h2><div class="value">${(stats?.comp||0).toLocaleString()}</div></div>
      <div class="card"><h2>Avg Latency</h2><div class="value">${Math.round(stats?.latency||0)}ms</div></div>
    </div>
    <h2 style="margin:24px 0 12px">By Model</h2>
    <table><thead><tr><th>Model</th><th>Requests</th><th>Tokens</th><th>Cost</th></tr></thead>
    <tbody>${modelRows || '<tr><td colspan=4>No usage yet</td></tr>'}</tbody></table>
  `));
});

// GET /dashboard/billing
dashboard.get("/billing", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.redirect("/dashboard/login");

  const user = dbGet("SELECT * FROM users WHERE id = ?", [token]);
  if (!user) return c.html(htmlPage("Unauthorized", `<p>Login required</p>`));

  const txs = dbAll("SELECT * FROM billing_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", [user.id]);
  const txRows = txs.map((t: any) => `<tr>
    <td>${t.created_at?.slice(0,16) || '-'}</td>
    <td><span class="badge badge-${t.type==='topup'||t.type==='midtrans_settled'?'green':'blue'}">${t.type}</span></td>
    <td>${t.description || '-'}</td>
    <td>$${t.amount.toFixed(2)}</td>
  </tr>`).join("");

  return c.html(htmlPage("Billing", `
    <h1 style="margin-bottom:16px">Billing</h1>
    <div class="card"><h2>Balance</h2><div class="value">$${user.balance.toFixed(2)}</div></div>
    <h2 style="margin:24px 0 12px">Transactions</h2>
    <table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th></tr></thead>
    <tbody>${txRows || '<tr><td colspan=4>No transactions</td></tr>'}</tbody></table>
  `));
});

// GET /dashboard/pricing
dashboard.get("/pricing", (c) => {
  const models = dbAll("SELECT * FROM models WHERE is_active = 1 ORDER BY provider_id, id");

  const rows = models.map((m: any) => `<tr>
    <td><strong>${m.display_name}</strong><br><small style="color:#6b7280">${m.id}</small></td>
    <td>${m.provider_id}</td>
    <td>${(m.context_length||0).toLocaleString()}</td>
    <td>$${(m.pricing_input * 1000000).toFixed(2)}/M</td>
    <td>$${(m.pricing_output * 1000000).toFixed(2)}/M</td>
    <td>${m.supports_streaming ? '✅' : '❌'} ${m.supports_vision ? '👁' : ''} ${m.supports_tools ? '🔧' : ''}</td>
  </tr>`).join("");

  return c.html(htmlPage("Pricing", `
    <h1 style="margin-bottom:8px">Model Pricing</h1>
    <p style="color:#9ca3af;margin-bottom:16px">Prices per million tokens (with ${process.env.DEFAULT_MARKUP_PERCENT || 10}% markup)</p>
    <table><thead><tr><th>Model</th><th>Provider</th><th>Context</th><th>Input</th><th>Output</th><th>Features</th></tr></thead>
    <tbody>${rows}</tbody></table>
  `));
});

// GET /dashboard/login
dashboard.get("/login", (c) => {
  return c.html(htmlPage("Login", `
    <div style="max-width:400px;margin:80px auto">
      <h1 style="margin-bottom:24px;text-align:center">Login to WebNesti</h1>
      <div class="card">
        <form id="loginForm">
          <label style="display:block;margin-bottom:8px;color:#9ca3af">Email</label>
          <input type="email" id="email" placeholder="admin@webnesti.com" style="width:100%;padding:10px;border-radius:6px;border:1px solid #374151;background:#1f2937;color:#f9fafb;margin-bottom:16px" required>
          <button type="submit" class="btn btn-primary" style="width:100%">Login</button>
        </form>
        <p id="error" style="color:#f87171;margin-top:12px;display:none"></p>
      </div>
    </div>
    <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({email})
        });
        const data = await res.json();
        if (res.ok && data.token) {
          window.location.href = '/dashboard?token=' + data.user.id;
        } else {
          document.getElementById('error').textContent = data.error || 'Login failed';
          document.getElementById('error').style.display = 'block';
        }
      } catch(err) {
        document.getElementById('error').textContent = 'Connection error';
        document.getElementById('error').style.display = 'block';
      }
    });
    </script>
  `));
});

export default dashboard;
