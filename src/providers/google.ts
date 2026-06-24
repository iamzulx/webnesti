import { GoogleGenerativeAI } from "@google/generative-ai";
import { Provider, ChatRequest, ChatResponse, StreamChunk, ModelInfo } from "./types.js";
import { randomUUID } from "crypto";
import { unixNow, buildModelList } from "./openai-mappers.js";

export class GoogleProvider implements Provider {
  id = "google";
  name = "Google";
  private genAI: GoogleGenerativeAI;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  isAvailable(): boolean { return !!this.apiKey; }

  listModels(): ModelInfo[] {
    return buildModelList(
      ["gemini-2.0-flash", "gemini-2.5-pro-preview-05-06", "gemini-1.5-pro", "gemini-1.5-flash"],
      "google",
    );
  }

  async chat(req: ChatRequest, modelId: string): Promise<ChatResponse> {
    const model = this.genAI.getGenerativeModel({ model: modelId });
    const system = req.messages.find((m) => m.role === "system")?.content;
    const history = req.messages.filter((m) => m.role !== "system").slice(0, -1)
      .map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] }));
    const lastMsg = req.messages.filter((m) => m.role !== "system").slice(-1)[0]?.content || "";
    const chat = model.startChat({ systemInstruction: system, history });
    const res = await chat.sendMessage(lastMsg);
    const text = res.response.text();
    return {
      id: randomUUID(), object: "chat.completion", created: unixNow(), model: modelId,
      choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
      usage: {
        prompt_tokens: res.response.usageMetadata?.promptTokenCount || 0,
        completion_tokens: res.response.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: res.response.usageMetadata?.totalTokenCount || 0,
      },
    };
  }

  async *chatStream(req: ChatRequest, modelId: string): AsyncGenerator<StreamChunk> {
    const model = this.genAI.getGenerativeModel({ model: modelId });
    const system = req.messages.find((m) => m.role === "system")?.content;
    const history = req.messages.filter((m) => m.role !== "system").slice(0, -1)
      .map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] }));
    const lastMsg = req.messages.filter((m) => m.role !== "system").slice(-1)[0]?.content || "";
    const chat = model.startChat({ systemInstruction: system, history });
    const stream = await chat.sendMessageStream(lastMsg);
    const id = randomUUID();
    for await (const chunk of stream.stream) {
      const text = chunk.text();
      if (text) {
        yield { id, object: "chat.completion.chunk", created: unixNow(), model: modelId,
          choices: [{ index: 0, delta: { role: "assistant", content: text }, finish_reason: null }] };
      }
    }
    yield { id, object: "chat.completion.chunk", created: unixNow(), model: modelId,
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }] };
  }
}
