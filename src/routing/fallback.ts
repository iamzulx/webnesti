// Fallback chain: if primary provider fails, cascade to next
import { Provider } from "../providers/types.js";
import { recordRequest } from "./strategies.js";

export interface FallbackResult {
  success: boolean;
  providerId: string;
  response?: any;
  error?: string;
  attempts: number;
  latencyMs: number;
}

/**
 * Fallback chains per provider.
 *
 * IMPORTANT: cross-provider fallback is intentionally NOT enabled here. The
 * executor forwards the SAME rawModelId to each provider in the chain, and a
 * model id valid on one provider (e.g. "gpt-4o" on OpenAI) is not valid on
 * another (e.g. DeepSeek only has "deepseek-chat"). Forwarding it would
 * guarantee an upstream failure and poison the target provider's health
 * metrics. Until a per-provider model-equivalence map exists, every chain is
 * same-provider only — the "fallback" becomes a single retry attempt against
 * the primary, which is still useful for transient errors.
 */
const FALLBACK_CHAINS: Record<string, string[]> = {
  openai: ["openai"],
  anthropic: ["anthropic"],
  google: ["google"],
  deepseek: ["deepseek"],
  meta: ["meta"],
  mistral: ["mistral"],
  xai: ["xai"],
  cohere: ["cohere"],
};

export function getFallbackChain(providerId: string): string[] {
  return FALLBACK_CHAINS[providerId] || [providerId];
}

/** True if an error represents an auth failure (no point retrying). */
function isAuthError(err: any): boolean {
  const status = err?.status ?? err?.statusCode ?? err?.response?.status;
  if (status === 401 || status === 403) return true;
  // Fallback to message inspection for providers that don't expose status.
  const msg = String(err?.message || "");
  return msg.includes("401") || msg.includes("403");
}

export async function executeWithFallback<T>(
  providers: Map<string, Provider>,
  primaryProviderId: string,
  execute: (provider: Provider) => Promise<T>,
  maxAttempts: number = 2
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
      lastError = err?.message || "Provider error";
      const latencyMs = Date.now() - startTime;
      recordRequest(providerId, latencyMs, false);

      // Don't retry on auth errors — they won't resolve with a retry.
      if (isAuthError(err)) break;
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
