import { Provider, ChatRequest, ChatResponse, StreamChunk, ModelInfo } from "./types.js";
import OpenAI from "openai";

/**
 * Generic OpenAI-compatible provider.
 * Works with any provider that implements the OpenAI chat completions API:
 * - Groq, Cerebras, SambaNova, Fireworks, Together AI, Perplexity,
 *   Moonshot, Z.AI, MiniMax, Qwen/Alibaba, and many more.
 */
export class OpenAICompatProvider implements Provider {
  id: string;
  name: string;
  private client: OpenAI;
  private models: ModelInfo[];
  private baseUrl: string;

  constructor(id: string, name: string, apiKey: string, baseUrl: string, models: Array<{ id: string; contextLength?: number }>) {
    this.id = id;
    this.name = name;
    this.baseUrl = baseUrl;
    this.client = new OpenAI({ apiKey, baseURL: baseUrl });
    const now = Math.floor(Date.now() / 1000);
    this.models = models.map(m => ({
      id: m.id,
      object: "model" as const,
      created: now,
      owned_by: id,
      context_length: m.contextLength,
    }));
  }

  isAvailable(): boolean { return !!this.client.apiKey; }
  listModels(): ModelInfo[] { return this.models; }

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
