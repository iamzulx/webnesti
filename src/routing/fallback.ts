// Fallback chain: if primary provider fails, cascade to next
import { Provider } from "../providers/types.js";
import { ProviderWithMetrics, recordRequest } from "./strategies.js";

export interface FallbackResult {
  success: boolean;
  providerId: string;
  response?: any;
  error?: string;
  attempts: number;
  latencyMs: number;
}

// Default fallback chains per provider
const FALLBACK_CHAINS: Record<string, string[]> = {
  "openai": ["openai", "deepseek"],
  "anthropic": ["anthropic"],
  "google": ["google"],
  "deepseek": ["deepseek", "openai"],
  "meta": ["meta", "openai"],
  "mistral": ["mistral", "openai"],
  "xai": ["xai", "openai"],
};

export function getFallbackChain(providerId: string): string[] {
  return FALLBACK_CHAINS[providerId] || [providerId];
}

export async function executeWithFallback<T>(
  providers: Map<string, Provider>,
  primaryProviderId: string,
  execute: (provider: Provider) => Promise<T>,
  maxAttempts: number = 3
): Promise<FallbackResult> {
  const chain = getFallbackChain(primaryProviderId);
  const startTime = Date.now();
  let lastError: string | undefined;

  for (let i = 0; i < Math.min(chain.length, maxAttempts); i++) {
    const providerId = chain[i];
    const provider = providers.get(providerId);

    if (!provider) {
      lastError = `Provider '${providerId}' not available`;
      continue;
    }

    try {
      const response = await execute(provider);
      const latencyMs = Date.now() - startTime;
      recordRequest(providerId, latencyMs, true);
      return { success: true, providerId, response, attempts: i + 1, latencyMs };
    } catch (err: any) {
      lastError = err.message;
      const latencyMs = Date.now() - startTime;
      recordRequest(providerId, latencyMs, false);

      // Don't retry on auth errors (401/403) — they won't resolve with retry
      if (err.message?.includes("401") || err.message?.includes("403")) {
        break;
      }
    }
  }

  return {
    success: false,
    providerId: primaryProviderId,
    error: lastError || "All fallback providers failed",
    attempts: Math.min(chain.length, maxAttempts),
    latencyMs: Date.now() - startTime,
  };
}
