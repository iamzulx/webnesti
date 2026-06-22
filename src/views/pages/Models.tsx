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

export const ModelsPage: FC<{ models: ModelRow[]; providers: string[] }> = ({ models, providers }) => (
  <div x-data="{ search: '', provider: '' }">
    <div style="margin-bottom:28px">
      <h2 style="font-size:24px;font-weight:700">Models</h2>
      <p style="color:#9ca3af;font-size:14px;margin-top:4px">{models.length} models from {providers.length} providers</p>
    </div>

    {/* Filters */}
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <input
        type="text"
        placeholder="Search models..."
        x-model="search"
        style="flex:1;min-width:200px"
      />
      <select x-model="provider" style="width:auto;min-width:160px">
        <option value="">All Providers</option>
        {providers.map(p => <option value={p}>{p}</option>)}
      </select>
    </div>

    {/* Model Grid */}
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
            >
              <td style="font-family:monospace;font-size:13px">
                <span style="color:#0ea5e9">{m.id}</span>
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
  </div>
);
