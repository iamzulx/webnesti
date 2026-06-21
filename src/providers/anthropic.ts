import Anthropic from "@anthropic-ai/sdk";
import { Provider, ChatRequest, ChatResponse, StreamChunk, ModelInfo } from "./types.js";
import { randomUUID } from "crypto";

export class AnthropicProvider implements Provider {
  id = "anthropic";
  name = "Anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  isAvailable(): boolean { return !!this.client.apiKey; }

  listModels(): ModelInfo[] {
    const now = Math.floor(Date.now() / 1000);
    return [
      { id: "claude-sonnet-4-20250514", object: "model", created: now, owned_by: "anthropic" },
      { id: "claude-3-5-sonnet-20241022", object: "model", created: now, owned_by: "anthropic" },
      { id: "claude-3-5-haiku-20241022", object: "model", created: now, owned_by: "anthropic" },
      { id: "claude-3-opus-20240229", object: "model", created: now, owned_by: "anthropic" },
    ];
  }

  async chat(req: ChatRequest, modelId: string): Promise<ChatResponse> {
    const system = req.messages.find((m) => m.role === "system")?.content;
    const messages = req.messages.filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    const res = await this.client.messages.create({
      model: modelId, max_tokens: req.max_tokens || 4096,
      system: system || undefined, messages,
    });
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    return {
      id: res.id, object: "chat.completion", created: Math.floor(Date.now() / 1000), model: res.model,
      choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: res.stop_reason || "stop" }],
      usage: { prompt_tokens: res.usage.input_tokens, completion_tokens: res.usage.output_tokens, total_tokens: res.usage.input_tokens + res.usage.output_tokens },
    };
  }

  async *chatStream(req: ChatRequest, modelId: string): AsyncGenerator<StreamChunk> {
    const system = req.messages.find((m) => m.role === "system")?.content;
    const messages = req.messages.filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    const stream = this.client.messages.stream({ model: modelId, max_tokens: req.max_tokens || 4096, system: system || undefined, messages });
    const id = randomUUID();
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { id, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: modelId,
          choices: [{ index: 0, delta: { role: "assistant", content: event.delta.text }, finish_reason: null }] };
      }
    }
    yield { id, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: modelId,
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }] };
  }
}
