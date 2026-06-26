/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";

interface ModelOption { id: string; provider_id: string; display_name: string; pricing_input: number; pricing_output: number }

export const PlaygroundPage: FC<{ models: ModelOption[] }> = ({ models }) => {
  const grouped: Record<string, ModelOption[]> = {};
  for (const m of models) (grouped[m.provider_id] ||= []).push(m);

  return (
    <div>
      <div style="margin-bottom:28px">
        <h2 style="font-size:24px;font-weight:700">Playground</h2>
        <p style="color:#9ca3af;font-size:14px;margin-top:4px">{models.length} models — test any model in your browser</p>
      </div>

      <div style="display:grid;grid-template-columns:300px 1fr;gap:20px;min-height:600px" class="mobile-grid">
        {/* Sidebar Controls */}
        <div>
          <div class="card" style="margin-bottom:16px">
            <h3 style="font-size:11px;font-weight:600;margin-bottom:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em">Model</h3>
            <select id="pg-model" style="width:100%">
              {Object.entries(grouped).map(([provider, pModels]) => (
                <optgroup label={provider}>
                  {pModels.map(m => (
                    <option value={m.id}>{m.display_name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div class="card" style="margin-bottom:16px">
            <h3 style="font-size:11px;font-weight:600;margin-bottom:14px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em">Parameters</h3>
            <div style="margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
                <span style="color:#9ca3af">Temperature</span>
                <span id="pg-temp-val" style="color:#0ea5e9;font-weight:600;font-family:monospace">1.0</span>
              </div>
              <input id="pg-temp" type="range" min="0" max="2" step="0.1" value="1" style="width:100%;accent-color:#0ea5e9;height:6px" />
              <div style="display:flex;justify-content:space-between;font-size:10px;color:#6b7280;margin-top:2px"><span>Precise</span><span>Balanced</span><span>Creative</span></div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
                <span style="color:#9ca3af">Max Tokens</span>
                <span id="pg-max-tokens-val" style="color:#0ea5e9;font-weight:600;font-family:monospace">4096</span>
              </div>
              <input id="pg-max-tokens" type="range" min="256" max="16384" step="256" value="4096" style="width:100%;accent-color:#0ea5e9;height:6px" />
              <div style="display:flex;justify-content:space-between;font-size:10px;color:#6b7280;margin-top:2px"><span>256</span><span>8K</span><span>16K</span></div>
            </div>
          </div>

          <div class="card">
            <h3 style="font-size:11px;font-weight:600;margin-bottom:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em">System Message</h3>
            <textarea id="pg-system" placeholder="You are a helpful assistant..." style="width:100%;min-height:100px;resize:vertical"></textarea>
          </div>
        </div>

        {/* Chat Area */}
        <div class="card" style="display:flex;flex-direction:column">
          <div style="display:flex;gap:8px;margin-bottom:12px;justify-content:flex-end;align-items:center">
            <span id="pg-status" style="font-size:12px;color:#6b7280;flex:1"></span>
            <button id="pg-clear" class="btn-secondary" style="font-size:12px;padding:6px 14px;border-radius:8px">🗑 Clear</button>
            <button id="pg-save" class="btn-secondary" style="font-size:12px;padding:6px 14px;border-radius:8px">💾 Save</button>
          </div>

          <div id="pg-messages" style="flex:1;overflow-y:auto;min-height:400px;padding:8px 0">
            <div style="text-align:center;padding:80px 0;color:#6b7280">
              <div style="font-size:48px;margin-bottom:12px">💬</div>
              <p style="font-size:15px">Send a message to start</p>
              <p style="font-size:12px;margin-top:6px">Use ```code blocks``` and **bold** in responses</p>
            </div>
          </div>

          {/* Input */}
          <div style="display:flex;gap:8px;margin-top:16px">
            <input id="pg-input" type="text" placeholder="Type a message..." style="flex:1" />
            <button id="pg-send" class="btn-primary" style="white-space:nowrap">Send ↵</button>
            <button id="pg-stop" class="btn-secondary" style="display:none;white-space:nowrap;border-color:#ef4444;color:#ef4444">⏹ Stop</button>
          </div>
        </div>
      </div>
    </div>
  );
};
