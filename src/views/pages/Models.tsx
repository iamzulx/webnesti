/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";
import { Badge } from "../components/Cards.js";

interface ModelRow {
  id: string;
  provider_id: string;
  display_name: string;
  context_length: number | null;
  pricing_input: number;
  pricing_output: number;
  supports_streaming: number;
  supports_vision: number;
  supports_tools: number;
}

interface ProviderSummary {
  name: string;
  count: number;
  minPrice: number;
  maxPrice: number;
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10b981", anthropic: "#d97706", google: "#4285f4", deepseek: "#8b5cf6",
  meta: "#0ea5e9", xai: "#e5e7eb", mistral: "#f59e0b", cohere: "#ec4899",
  groq: "#f97316", cerebras: "#06b6d4", sambanova: "#10b981", fireworks: "#ef4444",
  together: "#8b5cf6", perplexity: "#0ea5e9", moonshot: "#6366f1", zai: "#14b8a6",
  minimax: "#a855f7", qwen: "#3b82f6",
};

export const ModelsPage: FC<{ models: ModelRow[]; providers: string[]; providerSummaries: ProviderSummary[] }> = ({ models, providers, providerSummaries }) => (
  <div x-data="{ search: '', provider: '' }">
    <div style="margin-bottom:28px">
      <h2 style="font-size:24px;font-weight:700">Models</h2>
      <p style="color:#9ca3af;font-size:14px;margin-top:4px">{models.length} models from {providers.length} providers — click a provider to filter</p>
    </div>

    {/* Provider Summary Cards */}
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:24px">
      {providerSummaries.map(ps => {
        const color = PROVIDER_COLORS[ps.name] || "#6b7280";
        return (
          <div
            class="card"
            style={`cursor:pointer;transition:all .2s;border-left:3px solid ${color}`}
            x-bind:style={`provider === '${ps.name}' ? 'box-shadow: 0 0 20px ${color}40; border-left-width: 4px' : ''`}
            x-on:click={`provider = provider === '${ps.name}' ? '' : '${ps.name}'`}
          >
            <div style="display:flex;align-items:center;gap:10px">
              <div style={`width:36px;height:36px;border-radius:10px;background:${color}20;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:${color}`}>
                {ps.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style="font-size:14px;font-weight:600;color:#e5e7eb">{ps.name}</div>
                <div style="font-size:11px;color:#9ca3af">{ps.count} model{ps.count !== 1 ? "s" : ""}</div>
              </div>
            </div>
            <div style="margin-top:10px;font-size:11px;color:#6b7280;display:flex;justify-content:space-between">
              <span>${ps.minPrice.toFixed(2)}</span>
              <span>→</span>
              <span>${ps.maxPrice.toFixed(2)} /1M</span>
            </div>
          </div>
        );
      })}
    </div>

    {/* Filters */}
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <input type="text" placeholder="Search models..." x-model="search" style="flex:1;min-width:200px" />
      <select x-model="provider" style="width:auto;min-width:160px">
        <option value="">All Providers</option>
        {providers.map(p => <option value={p}>{p}</option>)}
      </select>
      <span style="display:flex;align-items:center;font-size:13px;color:#6b7280">
        {providers.length > 0 ? `${models.length} models` : ""}
      </span>
    </div>

    {/* Model Table */}
    <div style="display:grid;gap:8px">
      <table>
        <thead>
          <tr>
            <th>Model ID</th>
            <th>Provider</th>
            <th>Context</th>
            <th>Input $/1M</th>
            <th>Output $/1M</th>
            <th>Features</th>
          </tr>
        </thead>
        <tbody>
          {models.map(m => (
            <tr
              x-show={`('${m.id}'.toLowerCase().includes(search.toLowerCase()) || '${m.display_name}'.toLowerCase().includes(search.toLowerCase())) && (!provider || '${m.provider_id}' === provider)`}
              style="cursor:pointer"
              data-id={m.id}
              data-provider={m.provider_id}
              data-name={m.display_name}
              data-ctx={String(m.context_length || 0)}
              data-pi={String(m.pricing_input)}
              data-po={String(m.pricing_output)}
              data-stream={String(m.supports_streaming)}
              data-vision={String(m.supports_vision)}
              data-tools={String(m.supports_tools)}
              onclick="showModelModal(this.dataset)"
            >
              <td style="font-family:monospace;font-size:13px">
                <span style="color:#0ea5e9">{m.display_name}</span>
              </td>
              <td>
                <Badge text={m.provider_id} variant="info" />
              </td>
              <td style="font-size:13px">
                {m.context_length ? `${(m.context_length / 1000).toFixed(0)}K` : "—"}
              </td>
              <td style="font-size:13px;font-family:monospace">
                ${(m.pricing_input * 1_000_000).toFixed(2)}
              </td>
              <td style="font-size:13px;font-family:monospace">
                ${(m.pricing_output * 1_000_000).toFixed(2)}
              </td>
              <td style="display:flex;gap:4px;flex-wrap:wrap">
                {m.supports_streaming ? <Badge text="stream" variant="success" /> : null}
                {m.supports_vision ? <Badge text="vision" variant="warning" /> : null}
                {m.supports_tools ? <Badge text="tools" variant="info" /> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Model Detail Modal */}
    <div id="model-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:200;align-items:center;justify-content:center;backdrop-filter:blur(4px)">
      <div class="card" style="max-width:520px;width:92%;max-height:80vh;overflow-y:auto" onclick="event.stopPropagation()">
        <div id="model-modal-content"></div>
      </div>
    </div>
  </div>
);
