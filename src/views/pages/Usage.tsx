/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";

interface UsagePageProps {
  summary: any;
  byModel: Array<{ model_id: string; requests: number; prompt_tokens: number; completion_tokens: number; total_tokens: number; cost: number; avg_latency: number }>;
  recent: Array<any>;
}

export const UsagePage: FC<UsagePageProps> = ({ summary, byModel, recent }) => (
  <div>
    <div style="margin-bottom:28px">
      <h2 style="font-size:24px;font-weight:700">Usage Analytics</h2>
      <p style="color:#9ca3af;font-size:14px;margin-top:4px">Your API usage over time</p>
    </div>

    {/* Summary Cards */}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:28px">
      <div class="card"><div style="font-size:12px;color:#9ca3af">Total Requests</div><div style="font-size:24px;font-weight:700">{(summary?.total_requests || 0).toLocaleString()}</div></div>
      <div class="card"><div style="font-size:12px;color:#9ca3af">Total Tokens</div><div style="font-size:24px;font-weight:700">{(summary?.total_tokens || 0).toLocaleString()}</div></div>
      <div class="card"><div style="font-size:12px;color:#9ca3af">Total Cost</div><div style="font-size:24px;font-weight:700">${(summary?.total_cost || 0).toFixed(4)}</div></div>
      <div class="card"><div style="font-size:12px;color:#9ca3af">Avg Latency</div><div style="font-size:24px;font-weight:700">{Math.round(summary?.avg_latency || 0)}ms</div></div>
    </div>

    {/* By Model */}
    <div class="card" style="margin-bottom:20px">
      <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">Usage by Model</h3>
      {byModel.length === 0 ? (
        <p style="color:#6b7280;text-align:center;padding:40px 0">No usage data yet.</p>
      ) : (
        <table>
          <thead><tr><th>Model</th><th>Requests</th><th>Input Tokens</th><th>Output Tokens</th><th>Total</th><th>Cost</th><th>Avg Latency</th></tr></thead>
          <tbody>
            {byModel.map(m => (
              <tr>
                <td style="font-family:monospace;font-size:13px;color:#0ea5e9">{m.model_id}</td>
                <td>{m.requests}</td>
                <td>{(m.prompt_tokens || 0).toLocaleString()}</td>
                <td>{(m.completion_tokens || 0).toLocaleString()}</td>
                <td>{(m.total_tokens || 0).toLocaleString()}</td>
                <td>${(m.cost || 0).toFixed(4)}</td>
                <td>{Math.round(m.avg_latency || 0)}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>

    {/* Recent Logs */}
    <div class="card">
      <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">Recent Requests</h3>
      {recent.length === 0 ? (
        <p style="color:#6b7280;text-align:center;padding:40px 0">No requests yet.</p>
      ) : (
        <table>
          <thead><tr><th>Model</th><th>Provider</th><th>Tokens</th><th>Cost</th><th>Latency</th><th>Time</th></tr></thead>
          <tbody>
            {recent.slice(0, 50).map(r => (
              <tr>
                <td style="font-family:monospace;font-size:13px">{r.model_id}</td>
                <td>{r.provider_id}</td>
                <td>{(r.total_tokens || 0).toLocaleString()}</td>
                <td>${(r.cost_usd || 0).toFixed(6)}</td>
                <td>{Math.round(r.latency_ms || 0)}ms</td>
                <td style="font-size:12px;color:#9ca3af">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);
