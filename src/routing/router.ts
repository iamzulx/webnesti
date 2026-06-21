// Core routing engine — resolves model → provider → fallback chain
import { Provider, ChatRequest, ChatResponse, StreamChunk } from "../providers/types.js";
import { dbGet, dbAll } from "../db/index.js";
import { RoutingStrategy, ProviderWithMetrics, getMetrics, selectProvider } from "./strategies.js";
import { executeWithFallback, getFallbackChain } from "./fallback.js";

export interface RouteResult {
  provider: Provider;
  rawModelId: string;
  strategy: RoutingStrategy;
  fallbackChain: string[];
}

// Model → provider prefix mapping (for models without "provider/model" format)
const MODEL_ALIASES: Record<string, { providerId: string; rawModelId: string }> = {
  "gpt-4o": { providerId: "openai", rawModelId: "gpt-4o" },
  "gpt-4o-mini": { providerId: "openai", rawModelId: "gpt-4o-mini" },
  "gpt-4-turbo": { providerId: "openai", rawModelId: "gpt-4-turbo" },
  "gpt-3.5-turbo": { providerId: "openai", rawModelId: "gpt-3.5-turbo" },
  "claude-sonnet-4-20250514": { providerId: "anthropic", rawModelId: "claude-sonnet-4-20250514" },
  "claude-3-5-sonnet-20241022": { providerId: "anthropic", rawModelId: "claude-3-5-sonnet-20241022" },
  "claude-3-5-haiku-20241022": { providerId: "anthropic", rawModelId: "claude-3-5-haiku-20241022" },
  "claude-3-opus-20240229": { providerId: "anthropic", rawModelId: "claude-3-opus-20240229" },
  "gemini-2.0-flash": { providerId: "google", rawModelId: "gemini-2.0-flash" },
  "gemini-1.5-pro": { providerId: "google", rawModelId: "gemini-1.5-pro" },
  "gemini-1.5-flash": { providerId: "google", rawModelId: "gemini-1.5-flash" },
  "deepseek-chat": { providerId: "deepseek", rawModelId: "deepseek-chat" },
  "deepseek-reasoner": { providerId: "deepseek", rawModelId: "deepseek-reasoner" },
  "llama-3.1-70b": { providerId: "meta", rawModelId: "llama-3.1-70b" },
  "llama-3.1-8b": { providerId: "meta", rawModelId: "llama-3.1-8b" },
  "mistral-large": { providerId: "mistral", rawModelId: "mistral-large" },
  "mistral-small": { providerId: "mistral", rawModelId: "mistral-small" },
  "grok-2": { providerId: "xai", rawModelId: "grok-2" },
  "grok-2-mini": { providerId: "xai", rawModelId: "grok-2-mini" },
};

/**
 * Resolve a model ID to a provider and raw model ID.
 * Supports both "provider/model" format and bare model names.
 */
export function resolveModel(
  modelId: string,
  providers: Map<string, Provider>,
  strategy: RoutingStrategy = "balanced"
): RouteResult | undefined {
  // 1. Try "provider/model" format
  if (modelId.includes("/")) {
    const [pid, mid] = modelId.split("/", 2);
    const provider = providers.get(pid);
    if (provider) {
      const chain = getFallbackChain(pid);
      return { provider, rawModelId: mid, strategy, fallbackChain: chain };
    }
  }

  // 2. Try alias lookup
  const alias = MODEL_ALIASES[modelId];
  if (alias) {
    const provider = providers.get(alias.providerId);
    if (provider) {
      const chain = getFallbackChain(alias.providerId);
      return { provider, rawModelId: alias.rawModelId, strategy, fallbackChain: chain };
    }
  }

  // 3. Search all providers for the model
  for (const [pid, provider] of Array.from(providers.entries())) {
    const models = provider.listModels();
    if (models.some(m => m.id === modelId)) {
      const chain = getFallbackChain(pid);
      return { provider, rawModelId: modelId, strategy, fallbackChain: chain };
    }
  }

  // 4. Smart routing: find best provider based on strategy
  const candidates: ProviderWithMetrics[] = [];
  for (const [pid, provider] of Array.from(providers.entries())) {
    const m = getMetrics(pid) || { avgLatencyMs: 1000, errorRate: 0, lastUsed: 0, totalRequests: 0, successfulRequests: 0 };
    candidates.push({ provider, metrics: m, priority: 100, costPerToken: 0.00001 });
  }

  if (candidates.length > 0) {
    const selected = selectProvider(candidates, strategy);
    if (selected) {
      const chain = getFallbackChain(selected.provider.id);
      return { provider: selected.provider, rawModelId: modelId, strategy, fallbackChain: chain };
    }
  }

  return undefined;
}

/**
 * Execute a chat request with routing + fallback.
 */
export async function routeChatRequest(
  req: ChatRequest,
  providers: Map<string, Provider>,
  strategy: RoutingStrategy = "balanced"
): Promise<{ response: ChatResponse; route: RouteResult; fallback: any }> {
  const route = resolveModel(req.model, providers, strategy);
  if (!route) {
    throw new Error(`Model '${req.model}' not available. Check GET /v1/models`);
  }

  const result = await executeWithFallback(
    providers,
    route.provider.id,
    async (provider) => provider.chat(req, route.rawModelId)
  );

  if (!result.success) {
    throw new Error(result.error || "All providers failed");
  }

  return { response: result.response, route, fallback: result };
}

/**
 * Execute a streaming chat request with routing + fallback.
 */
export async function routeChatStreamRequest(
  req: ChatRequest,
  providers: Map<string, Provider>,
  strategy: RoutingStrategy = "balanced"
): Promise<{ stream: AsyncGenerator<StreamChunk>; route: RouteResult }> {
  const route = resolveModel(req.model, providers, strategy);
  if (!route) {
    throw new Error(`Model '${req.model}' not available. Check GET /v1/models`);
  }

  // For streaming, we try the primary provider directly (no fallback mid-stream)
  const stream = route.provider.chatStream(req, route.rawModelId);
  return { stream, route };
}
