import OpenAI from "openai";
import { Provider, ChatRequest, ChatResponse, StreamChunk, ModelInfo } from "./types.js";

export class OpenAIProvider implements Provider {
  id = "openai";
  name = "OpenAI";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  isAvailable(): boolean { return !!this.client.apiKey; }

  listModels(): ModelInfo[] {
    const now = Math.floor(Date.now() / 1000);
    return [
      { id: "gpt-5.5", object: "model", created: now, owned_by: "openai" },
      { id: "gpt-5.4", object: "model", created: now, owned_by: "openai" },
      { id: "gpt-5.4-mini", object: "model", created: now, owned_by: "openai" },
      { id: "gpt-4.1", object: "model", created: now, owned_by: "openai" },
      { id: "gpt-4.1-mini", object: "model", created: now, owned_by: "openai" },
      { id: "gpt-4.1-nano", object: "model", created: now, owned_by: "openai" },
      { id: "o3", object: "model", created: now, owned_by: "openai" },
      { id: "o4-mini", object: "model", created: now, owned_by: "openai" },
      { id: "gpt-4o", object: "model", created: now, owned_by: "openai" },
      { id: "gpt-4o-mini", object: "model", created: now, owned_by: "openai" },
    ];
  }

  async chat(req: ChatRequest, modelId: string): Promise<ChatResponse> {
    const res = await this.client.chat.completions.create({
      model: modelId,
      messages: req.messages,
      temperature: req.temperature,
      max_tokens: req.max_tokens,
      top_p: req.top_p,
      stream: false,
    });
    return {
      id: res.id, object: "chat.completion", created: res.created, model: res.model,
      choices: res.choices.map((c, i) => ({
        index: i,
        message: { role: "assistant" as const, content: c.message.content || "" },
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
      max_tokens: req.max_tokens, top_p: req.top_p, stream: true,
      stream_options: { include_usage: true },
    });
    for await (const chunk of stream) {
      yield {
        id: chunk.id, object: "chat.completion.chunk", created: chunk.created, model: chunk.model,
        choices: chunk.choices.map((c) => ({
          index: c.index,
          delta: { role: c.delta.role as any, content: c.delta.content || undefined },
          finish_reason: c.finish_reason,
        })),
        usage: chunk.usage || undefined,
      } as any;
    }
  }
}
