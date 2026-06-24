import { Provider } from "./types.js";
import { OpenAIProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";
import { GoogleProvider } from "./google.js";
import { CohereProvider } from "./cohere.js";
import { OpenAICompatProvider } from "./openai-compat.js";
import { COMPAT_PROVIDER_CONFIGS } from "./provider-configs.js";
import { config } from "../config.js";
import { logger } from "../logger.js";

const providers = new Map<string, Provider>();

export function initProviders() {
  const add = (id: string, p: Provider) => {
    if (p.isAvailable()) providers.set(id, p);
  };

  // --- First-party providers with custom SDK adapters ---
  add("openai", new OpenAIProvider(config.providers.openai.apiKey));
  add("anthropic", new AnthropicProvider(config.providers.anthropic.apiKey));
  add("google", new GoogleProvider(config.providers.google.apiKey));
  add("cohere", new CohereProvider(config.providers.cohere?.apiKey || ""));

  // --- All OpenAI-compatible providers (config-driven) ---
  for (const [id, cfg] of Object.entries(COMPAT_PROVIDER_CONFIGS)) {
    const apiKey = (config.providers as any)[id]?.apiKey || "";
    add(id, new OpenAICompatProvider(id, cfg.name, apiKey, cfg.baseUrl, cfg.models));
  }

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
 * API key (BYOK). Returns undefined for unknown provider ids. The returned
 * instance is NOT registered in the global map — it's used for a single request.
 */
export function createProviderInstance(providerId: string, apiKey: string): Provider | undefined {
  if (!apiKey) return undefined;

  // First-party providers with custom SDK adapters
  switch (providerId) {
    case "openai": return new OpenAIProvider(apiKey);
    case "anthropic": return new AnthropicProvider(apiKey);
    case "google": return new GoogleProvider(apiKey);
    case "cohere": return new CohereProvider(apiKey);
  }

  // OpenAI-compatible providers — reuse the centralized config
  const cfg = COMPAT_PROVIDER_CONFIGS[providerId];
  if (cfg) return new OpenAICompatProvider(providerId, cfg.name, apiKey, cfg.baseUrl, cfg.models);

  return undefined;
}
