import { Provider, ChatRequest, ChatResponse, StreamChunk, ModelInfo, ChatMessage } from "./types.js";
import { randomUUID } from "crypto";
import { unixNow, buildModelList } from "./openai-mappers.js";

/**
 * Map our OpenAI-style messages to the Cohere v2 chat schema. v2 uses a single
 * `messages` array of `{ role, content }` with lowercase roles (system/user/
 * assistant) — it has no v1 `preamble` field and no `message` field, and the
 * system prompt is just a message with role "system".
 */
function toV2Messages(messages: ChatMessage[]): Array<{ role: string; content: string }> {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

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
    return buildModelList(["command-a", "command-r-plus", "command-r", "command"], "cohere");
  }

  async chat(req: ChatRequest, modelId: string): Promise<ChatResponse> {
    const body: any = {
      model: modelId,
      messages: toV2Messages(req.messages),
      max_tokens: req.max_tokens || 4096,
      temperature: req.temperature,
    };

    const res = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // Don't embed the raw upstream body in the error (it may end up in logs).
      await res.text().catch(() => "");
      throw new Error(`Cohere API error ${res.status}`);
    }

    const data = await res.json() as any;
    const text = data.message?.content?.[0]?.text || "";

    return {
      id: data.id || randomUUID(),
      object: "chat.completion",
      created: unixNow(),
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
    const body: any = {
      model: modelId,
      messages: toV2Messages(req.messages),
      max_tokens: req.max_tokens || 4096,
      temperature: req.temperature,
      stream: true,
    };

    const res = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      await res.text().catch(() => "");
      throw new Error(`Cohere API error ${res.status}`);
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
                created: unixNow(), model: modelId,
                choices: [{ index: 0, delta: { role: "assistant", content: chunk.delta?.message?.content?.text || "" }, finish_reason: null }],
              };
            }
          } catch {}
        }
      }
    }

    yield {
      id, object: "chat.completion.chunk",
      created: unixNow(), model: modelId,
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    };
  }
}
