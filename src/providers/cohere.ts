import { Provider, ChatRequest, ChatResponse, StreamChunk, ModelInfo } from "./types.js";
import { randomUUID } from "crypto";

/**
 * Cohere provider — uses Cohere's native chat API.
 * API: https://api.cohere.com/v2/chat
 * Docs: https://docs.cohere.com/docs/the-cohere-platform
 */
export class CohereProvider implements Provider {
  id = "cohere";
  name = "Cohere";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isAvailable(): boolean { return !!this.apiKey; }

  listModels(): ModelInfo[] {
    const now = Math.floor(Date.now() / 1000);
    return [
      { id: "command-a", object: "model", created: now, owned_by: "cohere" },
      { id: "command-r-plus", object: "model", created: now, owned_by: "cohere" },
      { id: "command-r", object: "model", created: now, owned_by: "cohere" },
      { id: "command", object: "model", created: now, owned_by: "cohere" },
    ];
  }

  async chat(req: ChatRequest, modelId: string): Promise<ChatResponse> {
    const system = req.messages.find((m) => m.role === "system")?.content;
    const messages = req.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "user" ? "USER" : "CHATBOT", message: m.content }));

    const body: any = {
      model: modelId,
      messages,
      max_tokens: req.max_tokens || 4096,
      temperature: req.temperature,
    };
    if (system) body.preamble = system;

    const res = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Cohere API error ${res.status}: ${err}`);
    }

    const data = await res.json() as any;
    const text = data.text || data.message?.content?.[0]?.text || "";

    return {
      id: data.generation_id || randomUUID(),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: modelId,
      choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
      usage: {
        prompt_tokens: data.usage?.tokens?.input_tokens || 0,
        completion_tokens: data.usage?.tokens?.output_tokens || 0,
        total_tokens: (data.usage?.tokens?.input_tokens || 0) + (data.usage?.tokens?.output_tokens || 0),
      },
    };
  }

  async *chatStream(req: ChatRequest, modelId: string): AsyncGenerator<StreamChunk> {
    const system = req.messages.find((m) => m.role === "system")?.content;
    const messages = req.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "user" ? "USER" : "CHATBOT", message: m.content }));

    const body: any = {
      model: modelId,
      messages,
      max_tokens: req.max_tokens || 4096,
      temperature: req.temperature,
      stream: true,
    };
    if (system) body.preamble = system;

    const res = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Cohere API error ${res.status}: ${err}`);
    }

    const id = randomUUID();
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    if (!reader) throw new Error("No response body");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const chunk = JSON.parse(data);
            if (chunk.type === "content-delta") {
              yield {
                id, object: "chat.completion.chunk",
                created: Math.floor(Date.now() / 1000), model: modelId,
                choices: [{ index: 0, delta: { role: "assistant", content: chunk.delta?.message?.content?.text || "" }, finish_reason: null }],
              };
            }
          } catch {}
        }
      }
    }

    yield {
      id, object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000), model: modelId,
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    };
  }
}
