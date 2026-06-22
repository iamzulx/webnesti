// Routing strategies for provider selection
import { Provider } from "../providers/types.js";

export type RoutingStrategy = "cheapest" | "fastest" | "balanced" | "round_robin";

export interface RoutingMetrics {
  avgLatencyMs: number;      // Average latency in ms
  errorRate: number;         // 0.0 - 1.0
  lastUsed: number;          // Timestamp
  totalRequests: number;
  successfulRequests: number;
}

export interface ProviderWithMetrics {
  provider: Provider;
  metrics: RoutingMetrics;
  priority: number;          // Lower = higher priority
  costPerToken: number;      // Average cost per token (input + output)
}

// In-memory metrics tracker
const metrics = new Map<string, RoutingMetrics>();

export function recordRequest(providerId: string, latencyMs: number, success: boolean) {
  let m = metrics.get(providerId);
  if (!m) {
    m = { avgLatencyMs: latencyMs, errorRate: 0, lastUsed: Date.now(), totalRequests: 0, successfulRequests: 0 };
    metrics.set(providerId, m);
  }
  m.totalRequests++;
  if (success) m.successfulRequests++;
  m.avgLatencyMs = (m.avgLatencyMs * (m.totalRequests - 1) + latencyMs) / m.totalRequests;
  m.errorRate = 1 - (m.successfulRequests / m.totalRequests);
  m.lastUsed = Date.now();
}

export function getMetrics(providerId: string): RoutingMetrics | undefined {
  return metrics.get(providerId);
}

// Snapshot of all tracked provider metrics, for the public status endpoint.
export function getAllMetrics(): Record<string, RoutingMetrics> {
  const out: Record<string, RoutingMetrics> = {};
  for (const [id, m] of metrics) out[id] = { ...m };
  return out;
}

// Round-robin counter
let rrIndex = 0;

export function selectProvider(
  candidates: ProviderWithMetrics[],
  strategy: RoutingStrategy
): ProviderWithMetrics | undefined {
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];

  // Filter out providers with >50% error rate
  const healthy = candidates.filter(c => c.metrics.errorRate < 0.5);
  const pool = healthy.length > 0 ? healthy : candidates; // Fallback to all if none healthy

  switch (strategy) {
    case "cheapest":
      return pool.reduce((best, c) => c.costPerToken < best.costPerToken ? c : best);

    case "fastest":
      return pool.reduce((best, c) => c.metrics.avgLatencyMs < best.metrics.avgLatencyMs ? c : best);

    case "balanced": {
      // Weighted score: 40% cost + 30% latency + 30% reliability
      const scored = pool.map(c => {
        const costScore = 1 - (c.costPerToken / Math.max(...pool.map(p => p.costPerToken)));
        const latencyScore = 1 - (c.metrics.avgLatencyMs / Math.max(...pool.map(p => p.metrics.avgLatencyMs || 1)));
        const reliabilityScore = 1 - c.metrics.errorRate;
        return { ...c, score: costScore * 0.4 + latencyScore * 0.3 + reliabilityScore * 0.3 };
      });
      return scored.reduce((best, c) => c.score > best.score ? c : best);
    }

    case "round_robin":
      rrIndex = (rrIndex + 1) % pool.length;
      return pool[rrIndex];

    default:
      return pool[0];
  }
}
