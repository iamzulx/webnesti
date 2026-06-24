import OpenAI from "openai";
import { Provider, ChatRequest, ChatResponse, StreamChunk, ModelInfo } from "./types.js";
import { buildModelList, mapOpenAIResponse, mapOpenAIStreamChunk } from "./openai-mappers.js";

export class OpenAIProvider implements Provider {
  id = "openai";
  name = "OpenAI";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  isAvailable(): boolean { return !!this.client.apiKey; }

  listModels(): ModelInfo[] {
    return buildModelList(
      ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "o3", "o4-mini", "gpt-4o", "gpt-4o-mini"],
      "openai",
    );
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
    return mapOpenAIResponse(res);
  }

  async *chatStream(req: ChatRequest, modelId: string): AsyncGenerator<StreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: modelId, messages: req.messages, temperature: req.temperature,
      max_tokens: req.max_tokens, top_p: req.top_p, stream: true,
      stream_options: { include_usage: true },
    });
    for await (const chunk of stream) {
      yield mapOpenAIStreamChunk(chunk) as any;
    }
  }
}
