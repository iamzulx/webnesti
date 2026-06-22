// Core routing engine — resolves model → provider → fallback chain
import { Provider } from "../providers/types.js";
import { RoutingStrategy, ProviderWithMetrics, getMetrics, selectProvider } from "./strategies.js";
import { getFallbackChain } from "./fallback.js";

export interface RouteResult {
  provider: Provider;
  rawModelId: string;
  strategy: RoutingStrategy;
  fallbackChain: string[];
}

/**
 * Bare-name → "provider/model" aliases for convenience. These are verified
 * against each provider's live listModels() at resolution time (step 2), so a
 * stale alias simply falls through to the catalog search instead of forwarding
 * an unsupported model ID upstream. Keep these aligned with the seeded models.
 */
const MODEL_ALIASES: Record<string, { providerId: string; rawModelId: string }> = {
  // OpenAI (current frontier)
  "gpt-5.5": { providerId: "openai", rawModelId: "gpt-5.5" },
  "gpt-5.4": { providerId: "openai", rawModelId: "gpt-5.4" },
  "gpt-4o": { providerId: "openai", rawModelId: "gpt-4o" },
  "gpt-4o-mini": { providerId: "openai", rawModelId: "gpt-4o-mini" },
  // Anthropic (current)
  "claude-opus-4-8": { providerId: "anthropic", rawModelId: "claude-opus-4-8" },
  "claude-sonnet-4-6": { providerId: "anthropic", rawModelId: "claude-sonnet-4-6" },
  "claude-sonnet-4-5": { providerId: "anthropic", rawModelId: "claude-sonnet-4-5" },
  "claude-haiku-4-5": { providerId: "anthropic", rawModelId: "claude-haiku-4-5" },
  // Google
  "gemini-2.0-flash": { providerId: "google", rawModelId: "gemini-2.0-flash" },
  "gemini-1.5-pro": { providerId: "google", rawModelId: "gemini-1.5-pro" },
  "gemini-1.5-flash": { providerId: "google", rawModelId: "gemini-1.5-flash" },
  // DeepSeek
  "deepseek-chat": { providerId: "deepseek", rawModelId: "deepseek-chat" },
  "deepseek-reasoner": { providerId: "deepseek", rawModelId: "deepseek-reasoner" },
  // Mistral
  "mistral-large-latest": { providerId: "mistral", rawModelId: "mistral-large-latest" },
  "mistral-small-latest": { providerId: "mistral", rawModelId: "mistral-small-latest" },
  // xAI
  "grok-3": { providerId: "xai", rawModelId: "grok-3" },
  "grok-3-mini": { providerId: "xai", rawModelId: "grok-3-mini" },
};

/** Verify a provider actually lists the given model id. */
function providerHasModel(provider: Provider, modelId: string): boolean {
  try {
    return provider.listModels().some((m) => m.id === modelId);
  } catch {
    return false;
  }
}

/**
 * Resolve a model ID to a provider and raw model ID.
 * Supports both "provider/model" format and bare model names.
 * Returns undefined if no provider can serve the model (caller should 404).
 */
export function resolveModel(
  modelId: string,
  providers: Map<string, Provider>,
  strategy: RoutingStrategy = "balanced"
): RouteResult | undefined {
  // 1. Try "provider/model" format
  if (modelId.includes("/")) {
    // Split on the FIRST slash only — provider model IDs may contain slashes
    // (e.g. "accounts/fireworks/models/...", "meta-llama/Llama-3.3-70B-...").
    const slash = modelId.indexOf("/");
    const pid = modelId.slice(0, slash);
    const mid = modelId.slice(slash + 1);
    const provider = providers.get(pid);
    if (provider) {
      return { provider, rawModelId: mid, strategy, fallbackChain: getFallbackChain(pid) };
    }
  }

  // 2. Try alias lookup — but ONLY if the provider actually lists the model.
  //    A stale alias falls through to step 3 instead of forwarding a bad ID.
  const alias = MODEL_ALIASES[modelId];
  if (alias) {
    const provider = providers.get(alias.providerId);
    if (provider && providerHasModel(provider, alias.rawModelId)) {
      return { provider, rawModelId: alias.rawModelId, strategy, fallbackChain: getFallbackChain(alias.providerId) };
    }
  }

  // 3. Search all providers for the bare model id
  for (const [pid, provider] of Array.from(providers.entries())) {
    if (providerHasModel(provider, modelId)) {
      return { provider, rawModelId: modelId, strategy, fallbackChain: getFallbackChain(pid) };
    }
  }

  // 4. Not found — return undefined so the caller responds 404 rather than
  //    guessing a provider that doesn't support this model.
  return undefined;
}

/**
 * Build candidate list for smart provider selection among providers that
 * actually serve the given model. Used only when multiple providers list the
 * same model id (rare with provider-prefixed ids, common for bare names).
 */
export function selectAmongProviders(
  modelId: string,
  providers: Map<string, Provider>,
  strategy: RoutingStrategy
): Provider | undefined {
  const candidates: ProviderWithMetrics[] = [];
  for (const [pid, provider] of Array.from(providers.entries())) {
    if (!providerHasModel(provider, modelId)) continue;
    const m = getMetrics(pid) || { avgLatencyMs: 1000, errorRate: 0, lastUsed: 0, totalRequests: 0, successfulRequests: 0 };
    candidates.push({ provider, metrics: m, priority: 100, costPerToken: 0.00001 });
  }
  if (candidates.length === 0) return undefined;
  return selectProvider(candidates, strategy)?.provider;
}
