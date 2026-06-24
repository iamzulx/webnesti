/**
 * Centralized configuration for all OpenAI-compatible providers.
 *
 * Previously, DeepSeek / Meta / Mistral / xAI each had their own 50-60 line
 * class files that were near-identical copies of the OpenAICompatProvider logic.
 * This config map replaces those classes — initProviders() creates
 * OpenAICompatProvider instances from these entries, and createProviderInstance()
 * reuses them for BYOK.
 */
export interface CompatProviderConfig {
  name: string;
  baseUrl: string;
  models: Array<{ id: string; contextLength?: number }>;
}

export const COMPAT_PROVIDER_CONFIGS: Record<string, CompatProviderConfig> = {
  // --- Former first-party provider classes (now unified) ---
  deepseek: {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    models: [
      { id: "deepseek-chat" },
      { id: "deepseek-reasoner" },
    ],
  },
  meta: {
    name: "Meta (Llama)",
    baseUrl: "https://api.together.xyz/v1",
    models: [
      { id: "llama-3.1-70b" },
      { id: "llama-3.1-8b" },
      { id: "llama-3.1-405b" },
    ],
  },
  mistral: {
    name: "Mistral AI",
    baseUrl: "https://api.mistral.ai/v1",
    models: [
      { id: "mistral-large-latest" },
      { id: "mistral-small-latest" },
      { id: "codestral-latest" },
    ],
  },
  xai: {
    name: "xAI (Grok)",
    baseUrl: "https://api.x.ai/v1",
    models: [
      { id: "grok-3" },
      { id: "grok-3-mini" },
      { id: "grok-2" },
    ],
  },

  // --- Third-party OpenAI-compatible providers ---
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    models: [
      { id: "llama-3.3-70b-versatile", contextLength: 128000 },
      { id: "llama-3.1-8b-instant", contextLength: 128000 },
      { id: "mixtral-8x7b-32768", contextLength: 32768 },
      { id: "gemma2-9b-it", contextLength: 8192 },
    ],
  },
  cerebras: {
    name: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    models: [
      { id: "llama3.1-8b", contextLength: 8192 },
      { id: "llama3.1-70b", contextLength: 8192 },
    ],
  },
  sambanova: {
    name: "SambaNova",
    baseUrl: "https://api.sambanova.ai/v1",
    models: [
      { id: "Meta-Llama-3.1-8B-Instruct", contextLength: 16384 },
      { id: "Meta-Llama-3.1-70B-Instruct", contextLength: 131072 },
      { id: "DeepSeek-V3-0324", contextLength: 131072 },
    ],
  },
  fireworks: {
    name: "Fireworks AI",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    models: [
      { id: "accounts/fireworks/models/llama-v3p3-70b-instruct", contextLength: 131072 },
      { id: "accounts/fireworks/models/deepseek-v3", contextLength: 131072 },
      { id: "accounts/fireworks/models/qwen2p5-72b-instruct", contextLength: 131072 },
    ],
  },
  together: {
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", contextLength: 128000 },
      { id: "deepseek-ai/DeepSeek-V3", contextLength: 128000 },
      { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", contextLength: 32768 },
      { id: "mistralai/Mixtral-8x7B-Instruct-v0.1", contextLength: 32768 },
    ],
  },
  perplexity: {
    name: "Perplexity",
    baseUrl: "https://api.perplexity.ai",
    models: [
      { id: "llama-3.1-sonar-small-128k-online", contextLength: 128000 },
      { id: "llama-3.1-sonar-large-128k-online", contextLength: 128000 },
      { id: "llama-3.1-sonar-huge-128k-online", contextLength: 128000 },
    ],
  },
  moonshot: {
    name: "Moonshot (Kimi)",
    baseUrl: "https://api.moonshot.cn/v1",
    models: [
      { id: "moonshot-v1-8k", contextLength: 8192 },
      { id: "moonshot-v1-32k", contextLength: 32768 },
      { id: "moonshot-v1-128k", contextLength: 131072 },
    ],
  },
  zai: {
    name: "Z.AI (GLM)",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: [
      { id: "glm-4-plus", contextLength: 128000 },
      { id: "glm-4-flash", contextLength: 128000 },
      { id: "glm-4-long", contextLength: 1000000 },
    ],
  },
  minimax: {
    name: "MiniMax",
    baseUrl: "https://api.minimax.chat/v1",
    models: [
      { id: "MiniMax-Text-01", contextLength: 1000000 },
      { id: "abab6.5s-chat", contextLength: 8192 },
    ],
  },
  qwen: {
    name: "Alibaba Qwen",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: [
      { id: "qwen-plus", contextLength: 131072 },
      { id: "qwen-turbo", contextLength: 131072 },
      { id: "qwen-long", contextLength: 1000000 },
      { id: "qwen-max", contextLength: 32768 },
    ],
  },
};
