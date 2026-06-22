/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";

interface ModelOption { id: string; provider_id: string; display_name: string; pricing_input: number; pricing_output: number }

export const PlaygroundPage: FC<{ models: ModelOption[] }> = ({ models }) => (
  <div>
    <div style="margin-bottom:28px">
      <h2 style="font-size:24px;font-weight:700">Playground</h2>
      <p style="color:#9ca3af;font-size:14px;margin-top:4px">Test models directly in your browser</p>
    </div>

    <div style="display:grid;grid-template-columns:300px 1fr;gap:20px;min-height:600px">
      {/* Sidebar */}
      <div>
        <div class="card" style="margin-bottom:16px">
          <h3 style="font-size:11px;font-weight:600;margin-bottom:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em">Model</h3>
          <select id="pg-model" style="width:100%">
            {models.filter((_, i) => i < 50).map(m => (
              <option value={m.id}>{m.display_name}</option>
            ))}
          </select>
        </div>
        <div class="card">
          <h3 style="font-size:11px;font-weight:600;margin-bottom:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em">System Message</h3>
          <textarea id="pg-system" placeholder="You are a helpful assistant..." style="width:100%;min-height:100px;resize:vertical"></textarea>
        </div>
      </div>

      {/* Chat Area */}
      <div class="card" style="display:flex;flex-direction:column">
        <div id="pg-messages" style="flex:1;overflow-y:auto;min-height:400px;padding:8px 0">
          <div style="text-align:center;padding:80px 0;color:#6b7280">
            <div style="font-size:48px;margin-bottom:12px">💬</div>
            <p>Send a message to start the conversation</p>
          </div>
        </div>

        {/* Input */}
        <div style="display:flex;gap:8px;margin-top:16px">
          <input id="pg-input" type="text" placeholder="Type a message..." style="flex:1" />
          <button id="pg-send" class="btn-primary">Send</button>
        </div>
      </div>
    </div>
  </div>
);
