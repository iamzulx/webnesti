/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";

interface ApiKeyRow {
  id: string;
  key_prefix: string;
  name: string;
  rate_limit: number;
  daily_limit: number;
  is_active: number;
  created_at: string;
}

export const KeysPage: FC<{ keys: ApiKeyRow[] }> = ({ keys }) => (
  <div>
    <div style="margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-size:24px;font-weight:700">API Keys</h2>
        <p style="color:#9ca3af;font-size:14px;margin-top:4px">{keys.length} active keys</p>
      </div>
    </div>

    <div class="card" style="margin-bottom:24px">
      <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">Create New Key</h3>
      <div x-data="{ name: 'default', rate: 60, daily: 10000 }"
        style="display:grid;gap:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <input x-model="name" placeholder="Key name" />
          <input type="number" x-model="rate" placeholder="Rate limit (req/min)" />
          <input type="number" x-model="daily" placeholder="Daily limit" />
        </div>
        <button class="btn-primary" style="justify-self:start"
          x-on:click="createKey()">Create API Key</button>
      </div>
      <div id="new-key-result" style="margin-top:16px"></div>
    </div>

    <div class="card">
      <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">Your Keys</h3>
      {keys.length === 0 ? (
        <p style="color:#6b7280;text-align:center;padding:40px 0">No API keys yet.</p>
      ) : (
        <table>
          <thead><tr><th>Prefix</th><th>Name</th><th>Rate Limit</th><th>Daily Limit</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
          <tbody>
            {keys.map(k => (
              <tr>
                <td style="font-family:monospace;font-size:13px;color:#0ea5e9">{k.key_prefix}</td>
                <td>{k.name}</td>
                <td>{k.rate_limit}/min</td>
                <td>{k.daily_limit.toLocaleString()}</td>
                <td>
                  <span style={`display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;background:${k.is_active ? "#10b98120" : "#ef444420"};color:${k.is_active ? "#10b981" : "#ef4444"}`}>
                    {k.is_active ? "Active" : "Revoked"}
                  </span>
                </td>
                <td style="font-size:13px;color:#9ca3af">{new Date(k.created_at).toLocaleDateString()}</td>
                <td>
                  {k.is_active ? (
                    <button style="background:#ef444420;color:#ef4444;border:none;padding:4px 12px;border-radius:6px;font-size:12px;cursor:pointer"
                      x-on:click={`revokeKey('${k.id}')`}>Revoke</button>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);
