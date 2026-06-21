export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
}

export interface ChatResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: { index: number; message: ChatMessage; finish_reason: string }[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface StreamChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: { index: number; delta: Partial<ChatMessage>; finish_reason: string | null }[];
}

export interface ModelInfo {
  id: string;
  object: "model";
  created: number;
  owned_by: string;
}

export interface Provider {
  id: string;
  name: string;
  chat(req: ChatRequest, modelId: string): Promise<ChatResponse>;
  chatStream(req: ChatRequest, modelId: string): AsyncGenerator<StreamChunk>;
  listModels(): ModelInfo[];
  isAvailable(): boolean;
}
