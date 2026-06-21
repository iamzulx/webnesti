import { Provider, ChatRequest, ChatResponse, StreamChunk, ModelInfo } from "./types.js";
import OpenAI from "openai";
import { randomUUID } from "crypto";

export class MetaProvider implements Provider {
  id = "meta";
  name = "Meta (Llama)";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey, baseURL: "https://api.together.xyz/v1" });
  }

  isAvailable(): boolean { return !!this.client.apiKey; }

  listModels(): ModelInfo[] {
    const now = Math.floor(Date.now() / 1000);
    return [
      { id: "llama-3.1-70b", object: "model", created: now, owned_by: "meta" },
      { id: "llama-3.1-8b", object: "model", created: now, owned_by: "meta" },
      { id: "llama-3.1-405b", object: "model", created: now, owned_by: "meta" },
    ];
  }

  async chat(req: ChatRequest, modelId: string): Promise<ChatResponse> {
    const res = await this.client.chat.completions.create({
      model: modelId, messages: req.messages, temperature: req.temperature,
      max_tokens: req.max_tokens, stream: false,
    });
    return {
      id: res.id, object: "chat.completion", created: res.created, model: res.model,
      choices: res.choices.map((c, i) => ({
        index: i, message: { role: "assistant", content: c.message.content || "" },
        finish_reason: c.finish_reason || "stop",
      })),
      usage: {
        prompt_tokens: res.usage?.prompt_tokens || 0,
        completion_tokens: res.usage?.completion_tokens || 0,
        total_tokens: res.usage?.total_tokens || 0,
      },
    };
  }

  async *chatStream(req: ChatRequest, modelId: string): AsyncGenerator<StreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: modelId, messages: req.messages, temperature: req.temperature,
      max_tokens: req.max_tokens, stream: true,
    });
    for await (const chunk of stream) {
      yield {
        id: chunk.id, object: "chat.completion.chunk", created: chunk.created, model: chunk.model,
        choices: chunk.choices.map((c) => ({
          index: c.index, delta: { role: c.delta.role as any, content: c.delta.content || undefined },
          finish_reason: c.finish_reason,
        })),
      };
    }
  }
}
