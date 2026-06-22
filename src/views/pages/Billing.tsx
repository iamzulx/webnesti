/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";

interface TxRow { id: string; type: string; amount: number; description: string; created_at: string }

export const BillingPage: FC<{ balance: number; transactions: TxRow[] }> = ({ balance, transactions }) => (
  <div>
    <div style="margin-bottom:28px">
      <h2 style="font-size:24px;font-weight:700">Billing</h2>
      <p style="color:#9ca3af;font-size:14px;margin-top:4px">Top up your balance and view transaction history</p>
    </div>

    {/* Balance + Top Up */}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
      <div class="card">
        <div style="font-size:12px;color:#9ca3af;text-transform:uppercase">Current Balance</div>
        <div style="font-size:36px;font-weight:800;color:#10b981;margin:12px 0">${balance.toFixed(2)}</div>
      </div>
      <div class="card">
        <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">Top Up (IDR)</h3>
        <div style="display:grid;gap:12px">
          <input id="topup-amount" type="number" min="1000" placeholder="Amount in IDR (min Rp1.000)" />
          <button id="topup-btn" class="btn-primary" style="width:100%">Pay with Midtrans</button>
          <div id="topup-result"></div>
        </div>
      </div>
    </div>

    {/* Transaction History */}
    <div class="card">
      <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">Transaction History</h3>
      {transactions.length === 0 ? (
        <p style="color:#6b7280;text-align:center;padding:40px 0">No transactions yet.</p>
      ) : (
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Description</th></tr></thead>
          <tbody>
            {transactions.map(t => (
              <tr>
                <td style="font-size:13px;color:#9ca3af">{new Date(t.created_at).toLocaleString()}</td>
                <td>
                  <span style={`display:inline-flex;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;background:${t.type.includes("settled") ? "#10b98120" : t.type.includes("pending") ? "#f59e0b20" : "#ef444420"};color:${t.type.includes("settled") ? "#10b981" : t.type.includes("pending") ? "#f59e0b" : "#ef4444"}`}>
                    {t.type}
                  </span>
                </td>
                <td style="font-weight:600">Rp{t.amount.toLocaleString()}</td>
                <td style="font-size:13px;color:#9ca3af">{t.description || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);
