import { Provider, ChatRequest, ChatResponse, StreamChunk, ModelInfo } from "./types.js";
import OpenAI from "openai";

export class DeepSeekProvider implements Provider {
  id = "deepseek";
  name = "DeepSeek";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
  }

  isAvailable(): boolean { return !!this.client.apiKey; }

  listModels(): ModelInfo[] {
    const now = Math.floor(Date.now() / 1000);
    return [
      { id: "deepseek-chat", object: "model", created: now, owned_by: "deepseek" },
      { id: "deepseek-reasoner", object: "model", created: now, owned_by: "deepseek" },
      { id: "deepseek-v4-flash", object: "model", created: now, owned_by: "deepseek" },
      { id: "deepseek-v4-pro", object: "model", created: now, owned_by: "deepseek" },
      { id: "deepseek-v3.2", object: "model", created: now, owned_by: "deepseek" },
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
        prompt_tokens: res.usage?.prompt_tokens || 0, completion_tokens: res.usage?.completion_tokens || 0,
        total_tokens: res.usage?.total_tokens || 0,
      },
    };
  }

  async *chatStream(req: ChatRequest, modelId: string): AsyncGenerator<StreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: modelId, messages: req.messages, temperature: req.temperature,
      max_tokens: req.max_tokens, stream: true,
      stream_options: { include_usage: true },
    });
    for await (const chunk of stream) {
      yield {
        id: chunk.id, object: "chat.completion.chunk", created: chunk.created, model: chunk.model,
        choices: chunk.choices.map((c) => ({
          index: c.index, delta: { role: c.delta.role as any, content: c.delta.content || undefined },
          finish_reason: c.finish_reason,
        })),
        usage: chunk.usage || undefined,
      } as any;
    }
  }
}
