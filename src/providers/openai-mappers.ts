import type { ChatResponse, StreamChunk, ModelInfo } from "./types.js";

/** Unix epoch seconds — used everywhere models/responses need a timestamp. */
export function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

/** Build a ModelInfo list from simple id strings. */
export function buildModelList(ids: string[], ownedBy: string): ModelInfo[] {
  const now = unixNow();
  return ids.map((id) => ({ id, object: "model" as const, created: now, owned_by: ownedBy }));
}

/**
 * Map an OpenAI SDK chat completion response to our ChatResponse shape.
 * Shared by OpenAIProvider and every OpenAI-compatible provider.
 */
export function mapOpenAIResponse(res: {
  id: string;
  created: number;
  model: string;
  choices: Array<{ message: { content: string | null; role?: string }; finish_reason: string | null }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
}): ChatResponse {
  return {
    id: res.id,
    object: "chat.completion",
    created: res.created,
    model: res.model,
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

/**
 * Map an OpenAI SDK stream chunk to our StreamChunk shape.
 * Shared by OpenAIProvider and every OpenAI-compatible provider.
 */
export function mapOpenAIStreamChunk(chunk: {
  id: string;
  created: number;
  model: string;
  choices: Array<{ index: number; delta: { role?: string | null; content?: string | null }; finish_reason: string | null }>;
  usage?: unknown;
}): StreamChunk & { usage?: unknown } {
  return {
    id: chunk.id,
    object: "chat.completion.chunk",
    created: chunk.created,
    model: chunk.model,
    choices: chunk.choices.map((c) => ({
      index: c.index,
      delta: { role: c.delta.role as "system" | "user" | "assistant" | undefined, content: c.delta.content || undefined },
      finish_reason: c.finish_reason,
    })),
    usage: chunk.usage || undefined,
  };
}
