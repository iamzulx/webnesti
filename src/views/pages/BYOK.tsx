/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";

interface BYOKKey { id: string; provider: string; key_prefix: string; created_at: string }

export const BYOKPage: FC<{ keys: BYOKKey[] }> = ({ keys }) => (
  <div>
    <div style="margin-bottom:28px">
      <h2 style="font-size:24px;font-weight:700">Bring Your Own Key (BYOK)</h2>
      <p style="color:#9ca3af;font-size:14px;margin-top:4px">Use your own provider API keys for direct access</p>
    </div>

    <div class="card" style="margin-bottom:24px;background:linear-gradient(135deg,#f59e0b10,#ef444410);border-color:#f59e0b">
      <h3 style="font-size:16px;font-weight:600;margin-bottom:8px">⚠️ Pro Tier Required</h3>
      <p style="color:#9ca3af;font-size:14px">BYOK requires a Pro subscription. <a href="/views/pricing" style="color:#0ea5e9">Upgrade now</a></p>
    </div>

    {/* Register Key */}
    <div class="card" style="margin-bottom:24px">
      <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">Register Provider Key</h3>
      <div style="display:grid;gap:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <select id="byok-provider">
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="google">Google</option>
            <option value="deepseek">DeepSeek</option>
          </select>
          <input id="byok-key" type="password" placeholder="Your API key" />
        </div>
        <button class="btn-primary" style="justify-self:start" id="byok-register-btn">Register Key</button>
        <div id="byok-register-result"></div>
      </div>
    </div>

    {/* Registered Keys */}
    <div class="card">
      <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">Your Registered Keys</h3>
      {keys.length === 0 ? (
        <p style="color:#6b7280;text-align:center;padding:40px 0">No BYOK keys registered.</p>
      ) : (
        <table>
          <thead><tr><th>Provider</th><th>Key Prefix</th><th>Registered</th><th>Action</th></tr></thead>
          <tbody>
            {keys.map(k => (
              <tr>
                <td style="font-weight:600">{k.provider}</td>
                <td style="font-family:monospace;font-size:13px">{k.key_prefix}</td>
                <td style="font-size:13px;color:#9ca3af">{new Date(k.created_at).toLocaleDateString()}</td>
                <td>
                  <button style="background:#ef444420;color:#ef4444;border:none;padding:4px 12px;border-radius:6px;font-size:12px;cursor:pointer"
                    x-on:click={`removeByokKey('${k.id}')`}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);
