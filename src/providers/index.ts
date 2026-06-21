import { Provider } from "./types.js";
import { OpenAIProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";
import { GoogleProvider } from "./google.js";
import { DeepSeekProvider } from "./deepseek.js";
import { MetaProvider } from "./meta.js";
import { XAIProvider } from "./xai.js";
import { MistralProvider } from "./mistral.js";
import { config } from "../config.js";

const providers = new Map<string, Provider>();

export function initProviders() {
  const add = (id: string, p: Provider) => {
    if (p.isAvailable()) providers.set(id, p);
  };

  add("openai", new OpenAIProvider(config.providers.openai.apiKey));
  add("anthropic", new AnthropicProvider(config.providers.anthropic.apiKey));
  add("google", new GoogleProvider(config.providers.google.apiKey));
  add("deepseek", new DeepSeekProvider(config.providers.deepseek?.apiKey || ""));
  add("meta", new MetaProvider(config.providers.meta?.apiKey || ""));
  add("xai", new XAIProvider(config.providers.xai?.apiKey || ""));
  add("mistral", new MistralProvider(config.providers.mistral?.apiKey || ""));

  console.log(`[providers] Loaded ${providers.size}: ${[...providers.keys()].join(", ") || "none (add API keys to .env)"}`);
}

export function getProviderForModel(modelId: string): { provider: Provider; rawModelId: string } | undefined {
  if (modelId.includes("/")) {
    const [pid, mid] = modelId.split("/", 2);
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
