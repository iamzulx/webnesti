/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";

interface ReferralData {
  code: string;
  referral_link: string;
  referrals_count: number;
  total_earned: number;
  reward_per_referral: number;
  leaderboard: Array<{ name: string; referrals: number; earned: number }>;
}

export const ReferralPage: FC<{ data: ReferralData }> = ({ data }) => (
  <div>
    <div style="margin-bottom:28px">
      <h2 style="font-size:24px;font-weight:700">Referral Program</h2>
      <p style="color:#9ca3af;font-size:14px;margin-top:4px">Earn credits by inviting friends</p>
    </div>

    {/* Referral Code */}
    <div class="card" style="margin-bottom:24px;background:linear-gradient(135deg,#0ea5e910,#8b5cf610);border-color:#0ea5e9">
      <div style="text-align:center;padding:20px">
        <div style="font-size:14px;color:#9ca3af;margin-bottom:8px">Your Referral Code</div>
        <div style="font-size:32px;font-weight:800;color:#0ea5e9;font-family:monospace;margin-bottom:12px">{data.code}</div>
        <div style="background:#1e293b;border-radius:8px;padding:12px;font-size:13px;color:#94a3b8;margin-bottom:16px;word-break:break-all">
          {data.referral_link}
        </div>
        <button class="btn-primary" x-on:click="copyReferralLink()">Copy Link</button>
      </div>
    </div>

    {/* Stats */}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px">
      <div class="card"><div style="font-size:12px;color:#9ca3af">Referrals</div><div style="font-size:24px;font-weight:700">{data.referrals_count}</div></div>
      <div class="card"><div style="font-size:12px;color:#9ca3af">Total Earned</div><div style="font-size:24px;font-weight:700;color:#10b981">${data.total_earned.toFixed(2)}</div></div>
      <div class="card"><div style="font-size:12px;color:#9ca3af">Reward per Referral</div><div style="font-size:24px;font-weight:700;color:#f59e0b">${data.reward_per_referral}</div></div>
    </div>

    {/* Apply Code */}
    <div class="card" style="margin-bottom:24px">
      <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">Apply Referral Code</h3>
      <div style="display:flex;gap:12px">
        <input id="referral-apply-code" placeholder="Enter referral code" style="flex:1" />
        <button class="btn-primary" id="referral-apply-btn">Apply</button>
      </div>
      <div id="referral-apply-result" style="margin-top:12px"></div>
    </div>

    {/* Leaderboard */}
    <div class="card">
      <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">🏆 Top Referrers</h3>
      {data.leaderboard.length === 0 ? (
        <p style="color:#6b7280;text-align:center;padding:40px 0">No referrals yet. Be the first!</p>
      ) : (
        <table>
          <thead><tr><th>#</th><th>Name</th><th>Referrals</th><th>Earned</th></tr></thead>
          <tbody>
            {data.leaderboard.map((u, i) => (
              <tr>
                <td style="font-weight:700;color:{i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : '#b45309'}">{i + 1}</td>
                <td>{u.name || 'Anonymous'}</td>
                <td>{u.referrals}</td>
                <td>${(u.earned || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);
