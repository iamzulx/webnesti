/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";

interface BudgetData {
  balance: number;
  tier: string;
  monthly_spend: number;
  daily_spend: number;
  monthly_budget: number | null;
  rate_limit: number;
  daily_limit: number;
  alerts: Array<{ level: string; message: string; type: string }>;
}

export const BudgetPage: FC<{ data: BudgetData }> = ({ data }) => (
  <div>
    <div style="margin-bottom:28px">
      <h2 style="font-size:24px;font-weight:700">Budget & Limits</h2>
      <p style="color:#9ca3af;font-size:14px;margin-top:4px">Monitor spending and set limits</p>
    </div>

    {/* Alerts */}
    {data.alerts.length > 0 && (
      <div style="display:grid;gap:8px;margin-bottom:24px">
        {data.alerts.map(a => (
          <div class="card" style={`border-color:${a.level === "critical" ? "#ef4444" : "#f59e0b"};background:${a.level === "critical" ? "#ef444410" : "#f59e0b10"}`}>
            <span style={`color:${a.level === "critical" ? "#fca5a5" : "#fcd34d"};font-weight:600`}>{a.level.toUpperCase()}</span>
            <span style="color:#9ca3af;margin-left:8px">{a.message}</span>
          </div>
        ))}
      </div>
    )}

    {/* Budget Settings */}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
      <div class="card"><div style="font-size:12px;color:#9ca3af">Balance</div><div style="font-size:24px;font-weight:700">${data.balance.toFixed(2)}</div></div>
      <div class="card"><div style="font-size:12px;color:#9ca3af">Tier</div><div style="font-size:24px;font-weight:700">{data.tier.toUpperCase()}</div></div>
      <div class="card"><div style="font-size:12px;color:#9ca3af">Monthly Spend</div><div style="font-size:24px;font-weight:700">${(data.monthly_spend || 0).toFixed(2)}</div></div>
      <div class="card"><div style="font-size:12px;color:#9ca3af">Daily Spend</div><div style="font-size:24px;font-weight:700">${(data.daily_spend || 0).toFixed(2)}</div></div>
      <div class="card"><div style="font-size:12px;color:#9ca3af">Rate Limit</div><div style="font-size:24px;font-weight:700">{data.rate_limit}/min</div></div>
      <div class="card"><div style="font-size:12px;color:#9ca3af">Daily Limit</div><div style="font-size:24px;font-weight:700">{data.daily_limit.toLocaleString()}</div></div>
    </div>

    {/* Monthly Budget Cap */}
    <div class="card">
      <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">Monthly Budget Cap</h3>
      <div style="display:flex;gap:12px;align-items:end">
        <div style="flex:1">
          <label style="font-size:12px;color:#9ca3af;margin-bottom:6px;display:block">Set monthly spending limit (USD)</label>
          <input id="budget-monthly" type="number" min="0" step="0.01" placeholder={data.monthly_budget ? String(data.monthly_budget) : "No limit"} />
        </div>
        <button class="btn-primary" id="budget-save">Save</button>
      </div>
      {data.monthly_budget && (
        <div style="margin-top:12px">
          <div style="height:8px;background:#1e293b;border-radius:4px;overflow:hidden">
            <div style={`height:100%;width:${Math.min(100, ((data.monthly_spend || 0) / data.monthly_budget) * 100)}%;background:${((data.monthly_spend || 0) / data.monthly_budget) > 0.8 ? "#ef4444" : "#0ea5e9"};border-radius:4px;transition:width 0.3s`}></div>
          </div>
          <div style="font-size:12px;color:#9ca3af;margin-top:6px">${(data.monthly_spend || 0).toFixed(2)} / ${data.monthly_budget.toFixed(2)} ({Math.round(((data.monthly_spend || 0) / data.monthly_budget) * 100)}%)</div>
        </div>
      )}
    </div>
  </div>
);
