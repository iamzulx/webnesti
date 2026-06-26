/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";
import { StatsCard } from "../components/Cards.js";

interface DashboardData {
  user: { email: string; balance: number; tier: string };
  stats: {
    total_requests: number;
    total_tokens: number;
    total_cost: number;
    avg_latency: number;
  };
  recentModels: Array<{ model_id: string; requests: number; cost: number }>;
  totalModels: number;
  providerStatuses: Array<{ name: string; configured: boolean }>;
}

export const DashboardPage: FC<{ data: DashboardData }> = ({ data }) => {
  const activeProviders = data.providerStatuses.filter(p => p.configured).length;
  return (
    <div>
      <div style="margin-bottom:28px">
        <h2 style="font-size:24px;font-weight:700">Dashboard</h2>
        <p style="color:#9ca3af;font-size:14px;margin-top:4px">Overview of your API usage and account</p>
      </div>

      {/* Stats Grid */}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:28px">
        <StatsCard icon="💰" label="Balance" value={`$${data.user.balance.toFixed(2)}`} color="#10b981" />
        <StatsCard icon="📊" label="Requests" value={data.stats.total_requests.toLocaleString()} color="#0ea5e9" />
        <StatsCard icon="🪙" label="Tokens" value={data.stats.total_tokens.toLocaleString()} color="#8b5cf6" />
        <StatsCard icon="💸" label="Cost" value={`$${data.stats.total_cost.toFixed(4)}`} color="#f59e0b" />
        <StatsCard icon="⚡" label="Latency" value={`${Math.round(data.stats.avg_latency)}ms`} color="#06b6d4" />
        <StatsCard icon="🤖" label="Models" value={data.totalModels.toLocaleString()} color="#8b5cf6" />
        <StatsCard icon="🔌" label="Providers" value={`${activeProviders}/${data.providerStatuses.length} active`} color="#10b981" />
        <StatsCard icon="🏷️" label="Tier" value={data.user.tier.toUpperCase()} color="#ec4899" />
      </div>

      {/* Provider Status */}
      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="font-size:16px;font-weight:600">Provider Status</h3>
          <span style="font-size:12px;color:#6b7280">{activeProviders} of {data.providerStatuses.length} configured</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">
          {data.providerStatuses.map(p => (
            <div style={`display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:#1e293b;border:1px solid ${p.configured ? '#10b98130' : '#1f2937'}`}>
              <div style={`width:8px;height:8px;border-radius:50%;background:${p.configured ? '#10b981' : '#374151'};box-shadow:${p.configured ? '0 0 6px #10b98140' : 'none'}`}></div>
              <span style="font-size:13px;font-weight:500;flex:1">{p.name}</span>
              <span style={`font-size:10px;color:${p.configured ? '#10b981' : '#6b7280'}`}>{p.configured ? 'Active' : '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Models */}
      <div class="card" style="margin-bottom:20px">
        <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">Top Models by Usage</h3>
        {data.recentModels.length === 0 ? (
          <p style="color:#6b7280;font-size:14px;text-align:center;padding:40px 0">
            No usage data yet. Make your first API call to see stats here.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Requests</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.recentModels.slice(0, 10).map(m => (
                <tr>
                  <td style="font-family:monospace;font-size:13px;color:#0ea5e9">{m.model_id}</td>
                  <td>{m.requests}</td>
                  <td>${(m.cost || 0).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick Start */}
      <div class="card">
        <h3 style="font-size:16px;font-weight:600;margin-bottom:12px">Quick Start</h3>
        <pre style="background:#1e293b;border-radius:8px;padding:16px;font-size:13px;overflow-x:auto;color:#94a3b8;line-height:1.6">
{`curl https://api.webnesti.ai/v1/chat/completions \\\\
  -H "Authorization: Bearer *** \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "model": "openai/gpt-5.5",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
        </pre>
      </div>
    </div>
  );
};
