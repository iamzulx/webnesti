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
      { id: "claude-fable-5", object: "model", created: now, owned_by: "anthropic" },
      { id: "claude-opus-4-8", object: "model", created: now, owned_by: "anthropic" },
      { id: "claude-sonnet-4-6", object: "model", created: now, owned_by: "anthropic" },
      { id: "claude-haiku-4-5", object: "model", created: now, owned_by: "anthropic" },
      { id: "claude-opus-4-7", object: "model", created: now, owned_by: "anthropic" },
      { id: "claude-sonnet-4-5", object: "model", created: now, owned_by: "anthropic" },
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
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const event of stream) {
      if (event.type === "message_start") {
        // Capture input tokens from the initial message event
        inputTokens = event.message?.usage?.input_tokens || 0;
      } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { id, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: modelId,
          choices: [{ index: 0, delta: { role: "assistant", content: event.delta.text }, finish_reason: null }] };
      } else if (event.type === "message_delta") {
        // Capture final cumulative output tokens from the delta event
        outputTokens = event.usage?.output_tokens || 0;
      }
    }

    // Yield final chunk with usage data
    const usage = (inputTokens > 0 || outputTokens > 0)
      ? { prompt_tokens: inputTokens, completion_tokens: outputTokens, total_tokens: inputTokens + outputTokens }
      : undefined;

    yield { id, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: modelId,
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      usage,
    } as any;
  }
}
