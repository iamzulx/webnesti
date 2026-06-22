/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";

interface TierData { name: string; markup_percent: number; min_topup_usd: number; rate_limit_per_min: number | string; daily_limit: number | string; features: string[] }

export const PricingPage: FC<{ tiers: TierData[]; currentTier: any }> = ({ tiers, currentTier }) => (
  <div>
    <div style="margin-bottom:28px">
      <h2 style="font-size:24px;font-weight:700">Pricing</h2>
      <p style="color:#9ca3af;font-size:14px;margin-top:4px">Choose the plan that fits your needs</p>
    </div>

    {/* Current Tier Banner */}
    <div class="card" style="margin-bottom:24px;border-color:#0ea5e9;background:linear-gradient(135deg,#0ea5e910,#8b5cf610)">
      <h3 style="font-size:16px;font-weight:600;margin-bottom:8px">Current Plan: {currentTier?.tier?.toUpperCase()}</h3>
      <p style="color:#9ca3af;font-size:14px">Markup: {currentTier?.markup_percent}% | Rate limit: {currentTier?.rate_limit}/min | Daily: {currentTier?.daily_limit}</p>
    </div>

    {/* Tier Cards */}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:28px">
      {tiers.map(t => (
        <div class="card" style={`border-color:${currentTier?.tier === t.name ? "#0ea5e9" : "#1f2937"}`}>
          <h3 style="font-size:18px;font-weight:700;text-transform:uppercase">{t.name}</h3>
          <div style="font-size:32px;font-weight:800;color:#0ea5e9;margin:12px 0">
            {t.markup_percent === 0 ? "0%" : `+${t.markup_percent}%`}
          </div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:16px">Markup on provider cost</div>
          <div style="font-size:13px;color:#9ca3af;margin-bottom:4px">Min top-up: <strong style="color:#e5e7eb">${t.min_topup_usd}</strong></div>
          <div style="font-size:13px;color:#9ca3af;margin-bottom:4px">Rate limit: <strong style="color:#e5e7eb">{t.rate_limit_per_min}</strong></div>
          <div style="font-size:13px;color:#9ca3af;margin-bottom:16px">Daily limit: <strong style="color:#e5e7eb">{t.daily_limit}</strong></div>
          <ul style="list-style:none;padding:0;margin:0">
            {t.features.map(f => (
              <li style="font-size:13px;color:#9ca3af;padding:3px 0">✅ {f}</li>
            ))}
          </ul>
          {currentTier?.tier !== t.name && t.name !== "enterprise" && (
            <button class="btn-primary" style="width:100%;margin-top:16px;padding:10px"
              x-on:click={`upgradeTo('${t.name}')`}>Upgrade</button>
          )}
        </div>
      ))}
    </div>

    {/* Cost Calculator */}
    <div class="card">
      <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">Cost Calculator</h3>
      <div style="display:grid;gap:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <input id="calc-model" placeholder="Model (e.g. openai/gpt-4o)" />
          <input id="calc-input" type="number" placeholder="Input tokens" value="1000" />
          <input id="calc-output" type="number" placeholder="Output tokens" value="500" />
        </div>
        <div id="calc-result" class="card" style="background:#1e293b;border-color:#374151">
          <p style="color:#9ca3af">Enter values and calculate</p>
        </div>
      </div>
    </div>
  </div>
);
