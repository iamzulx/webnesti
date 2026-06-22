import { Provider } from "./types.js";
import { OpenAIProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";
import { GoogleProvider } from "./google.js";
import { DeepSeekProvider } from "./deepseek.js";
import { MetaProvider } from "./meta.js";
import { XAIProvider } from "./xai.js";
import { MistralProvider } from "./mistral.js";
import { CohereProvider } from "./cohere.js";
import { OpenAICompatProvider } from "./openai-compat.js";
import { config } from "../config.js";
import { logger } from "../logger.js";

const providers = new Map<string, Provider>();

export function initProviders() {
  const add = (id: string, p: Provider) => {
    if (p.isAvailable()) providers.set(id, p);
  };

  // --- First-party providers ---
  add("openai", new OpenAIProvider(config.providers.openai.apiKey));
  add("anthropic", new AnthropicProvider(config.providers.anthropic.apiKey));
  add("google", new GoogleProvider(config.providers.google.apiKey));
  add("deepseek", new DeepSeekProvider(config.providers.deepseek?.apiKey || ""));
  add("meta", new MetaProvider(config.providers.meta?.apiKey || ""));
  add("xai", new XAIProvider(config.providers.xai?.apiKey || ""));
  add("mistral", new MistralProvider(config.providers.mistral?.apiKey || ""));
  add("cohere", new CohereProvider(config.providers.cohere?.apiKey || ""));

  // --- OpenAI-compatible providers ---
  add("groq", new OpenAICompatProvider(
    "groq", "Groq",
    config.providers.groq?.apiKey || "",
    "https://api.groq.com/openai/v1",
    [
      { id: "llama-3.3-70b-versatile", contextLength: 128000 },
      { id: "llama-3.1-8b-instant", contextLength: 128000 },
      { id: "mixtral-8x7b-32768", contextLength: 32768 },
      { id: "gemma2-9b-it", contextLength: 8192 },
    ]
  ));

  add("cerebras", new OpenAICompatProvider(
    "cerebras", "Cerebras",
    config.providers.cerebras?.apiKey || "",
    "https://api.cerebras.ai/v1",
    [
      { id: "llama3.1-8b", contextLength: 8192 },
      { id: "llama3.1-70b", contextLength: 8192 },
    ]
  ));

  add("sambanova", new OpenAICompatProvider(
    "sambanova", "SambaNova",
    config.providers.sambanova?.apiKey || "",
    "https://api.sambanova.ai/v1",
    [
      { id: "Meta-Llama-3.1-8B-Instruct", contextLength: 16384 },
      { id: "Meta-Llama-3.1-70B-Instruct", contextLength: 131072 },
      { id: "DeepSeek-V3-0324", contextLength: 131072 },
    ]
  ));

  add("fireworks", new OpenAICompatProvider(
    "fireworks", "Fireworks AI",
    config.providers.fireworks?.apiKey || "",
    "https://api.fireworks.ai/inference/v1",
    [
      { id: "accounts/fireworks/models/llama-v3p3-70b-instruct", contextLength: 131072 },
      { id: "accounts/fireworks/models/deepseek-v3", contextLength: 131072 },
      { id: "accounts/fireworks/models/qwen2p5-72b-instruct", contextLength: 131072 },
    ]
  ));

  add("together", new OpenAICompatProvider(
    "together", "Together AI",
    config.providers.together?.apiKey || "",
    "https://api.together.xyz/v1",
    [
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", contextLength: 128000 },
      { id: "deepseek-ai/DeepSeek-V3", contextLength: 128000 },
      { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", contextLength: 32768 },
      { id: "mistralai/Mixtral-8x7B-Instruct-v0.1", contextLength: 32768 },
    ]
  ));

  add("perplexity", new OpenAICompatProvider(
    "perplexity", "Perplexity",
    config.providers.perplexity?.apiKey || "",
    "https://api.perplexity.ai",
    [
      { id: "llama-3.1-sonar-small-128k-online", contextLength: 128000 },
      { id: "llama-3.1-sonar-large-128k-online", contextLength: 128000 },
      { id: "llama-3.1-sonar-huge-128k-online", contextLength: 128000 },
    ]
  ));

  add("moonshot", new OpenAICompatProvider(
    "moonshot", "Moonshot (Kimi)",
    config.providers.moonshot?.apiKey || "",
    "https://api.moonshot.cn/v1",
    [
      { id: "moonshot-v1-8k", contextLength: 8192 },
      { id: "moonshot-v1-32k", contextLength: 32768 },
      { id: "moonshot-v1-128k", contextLength: 131072 },
    ]
  ));

  add("zai", new OpenAICompatProvider(
    "zai", "Z.AI (GLM)",
    config.providers.zai?.apiKey || "",
    "https://open.bigmodel.cn/api/paas/v4",
    [
      { id: "glm-4-plus", contextLength: 128000 },
      { id: "glm-4-flash", contextLength: 128000 },
      { id: "glm-4-long", contextLength: 1000000 },
    ]
  ));

  add("minimax", new OpenAICompatProvider(
    "minimax", "MiniMax",
    config.providers.minimax?.apiKey || "",
    "https://api.minimax.chat/v1",
    [
      { id: "MiniMax-Text-01", contextLength: 1000000 },
      { id: "abab6.5s-chat", contextLength: 8192 },
    ]
  ));

  add("qwen", new OpenAICompatProvider(
    "qwen", "Alibaba Qwen",
    config.providers.qwen?.apiKey || "",
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
    [
      { id: "qwen-plus", contextLength: 131072 },
      { id: "qwen-turbo", contextLength: 131072 },
      { id: "qwen-long", contextLength: 1000000 },
      { id: "qwen-max", contextLength: 32768 },
    ]
  ));

  logger.info("Providers loaded", { count: providers.size, providers: [...providers.keys()] });
}

export function getProviderForModel(modelId: string): { provider: Provider; rawModelId: string } | undefined {
  if (modelId.includes("/")) {
    // Split on the FIRST slash only. Some provider model IDs contain slashes
    // themselves (e.g. Fireworks "accounts/fireworks/models/..." or Together
    // "meta-llama/Llama-3.3-70B-..."); split("/", 2) would truncate those and
    // forward a broken model name upstream.
    const slash = modelId.indexOf("/");
    const pid = modelId.slice(0, slash);
    const mid = modelId.slice(slash + 1);
    const p = providers.get(pid);
    return p ? { provider: p, rawModelId: mid } : undefined;
  }
  for (const [pid, p] of Array.from(providers.entries())) {
    if (p.listModels().some((m) => m.id === modelId)) return { provider: p, rawModelId: modelId };
  }
  return undefined;
}

export function getAllProviders(): Provider[] { return [...providers.values()]; }
export function getProviderMap(): Map<string, Provider> { return providers; }

/**
 * Build a fresh provider instance for a given provider id with a user-supplied
 * API key (BYOK). Returns undefined for provider ids that aren't first-party
 * (OpenAI-compatible providers are not yet supported for BYOK). The returned
 * instance is NOT registered in the global map — it's used for a single request.
 */
export function createProviderInstance(providerId: string, apiKey: string): Provider | undefined {
  if (!apiKey) return undefined;
  switch (providerId) {
    case "openai": return new OpenAIProvider(apiKey);
    case "anthropic": return new AnthropicProvider(apiKey);
    case "google": return new GoogleProvider(apiKey);
    case "deepseek": return new DeepSeekProvider(apiKey);
    case "meta": return new MetaProvider(apiKey);
    case "xai": return new XAIProvider(apiKey);
    case "mistral": return new MistralProvider(apiKey);
    case "cohere": return new CohereProvider(apiKey);
    default: return undefined;
  }
}

