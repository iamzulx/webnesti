import {
  recordRequest, getMetrics, getAllMetrics, selectProvider,
  type RoutingStrategy, type ProviderWithMetrics, type RoutingMetrics,
} from "../src/routing/strategies.js";
import type { Provider } from "../src/providers/types.js";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) { console.log(`  ✅ ${name}`); passed++; }
    else { console.log(`  ❌ ${name}`); failed++; }
  } catch (e: any) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

// Helper to build a ProviderWithMetrics stub
function makeCandidate(
  id: string,
  costPerToken: number,
  avgLatencyMs: number,
  errorRate: number,
  priority = 100
): ProviderWithMetrics {
  const stub: Provider = {
    id,
    name: id,
    chat: async () => { throw new Error("stub"); },
    chatStream: async function* () {},
    listModels: () => [],
    isAvailable: () => true,
  };
  return {
    provider: stub,
    metrics: { avgLatencyMs, errorRate, lastUsed: Date.now(), totalRequests: 10, successfulRequests: Math.round(10 * (1 - errorRate)) },
    priority,
    costPerToken,
  };
}

console.log("\n=== Routing Strategies Tests ===\n");

// recordRequest + getMetrics
test("recordRequest creates new metrics entry", () => {
  recordRequest("test-provider-new", 100, true);
  const m = getMetrics("test-provider-new");
  return m !== undefined && m.totalRequests === 1 && m.successfulRequests === 1;
});

test("recordRequest accumulates metrics", () => {
  recordRequest("test-accum", 100, true);
  recordRequest("test-accum", 200, true);
  recordRequest("test-accum", 300, false);
  const m = getMetrics("test-accum")!;
  return m.totalRequests === 3 && m.successfulRequests === 2 && m.errorRate > 0.33 && m.errorRate < 0.34;
});

test("recordRequest computes running average latency", () => {
  recordRequest("test-latency", 100, true);
  recordRequest("test-latency", 300, true);
  const m = getMetrics("test-latency")!;
  // Average of 100 and 300 = 200 (within tolerance of running avg)
  return m.avgLatencyMs >= 150 && m.avgLatencyMs <= 250;
});

test("getMetrics returns undefined for unknown provider", () => {
  return getMetrics("unknown-provider-xyz") === undefined;
});

test("getAllMetrics returns snapshot of all tracked providers", () => {
  recordRequest("all-metrics-a", 50, true);
  recordRequest("all-metrics-b", 60, true);
  const all = getAllMetrics();
  return "all-metrics-a" in all && "all-metrics-b" in all;
});

// selectProvider — empty candidates
test("selectProvider returns undefined for empty list", () => {
  return selectProvider([], "cheapest") === undefined;
});

// selectProvider — single candidate
test("selectProvider returns sole candidate", () => {
  const c = makeCandidate("only", 0.001, 100, 0);
  const result = selectProvider([c], "cheapest");
  return result?.provider.id === "only";
});

// cheapest
test("selectProvider cheapest picks lowest cost", () => {
  const a = makeCandidate("expensive", 0.01, 100, 0);
  const b = makeCandidate("cheap", 0.001, 100, 0);
  const result = selectProvider([a, b], "cheapest");
  return result?.provider.id === "cheap";
});

// fastest
test("selectProvider fastest picks lowest latency", () => {
  const a = makeCandidate("slow", 0.001, 500, 0);
  const b = makeCandidate("fast", 0.001, 50, 0);
  const result = selectProvider([a, b], "fastest");
  return result?.provider.id === "fast";
});

// round_robin
test("selectProvider round_robin cycles through providers", () => {
  const a = makeCandidate("rr1", 0.001, 100, 0);
  const b = makeCandidate("rr2", 0.001, 100, 0);
  const c = makeCandidate("rr3", 0.001, 100, 0);
  const pool = [a, b, c];
  // Call multiple times and collect unique selections
  const ids = new Set<string>();
  for (let i = 0; i < 6; i++) {
    const r = selectProvider(pool, "round_robin");
    if (r) ids.add(r.provider.id);
  }
  return ids.size >= 2; // round-robin should hit multiple providers
});

// balanced
test("selectProvider balanced prefers cheap+fast+reliable", () => {
  const bad = makeCandidate("bad", 0.1, 2000, 0.4);
  const good = makeCandidate("good", 0.001, 50, 0);
  const result = selectProvider([bad, good], "balanced");
  return result?.provider.id === "good";
});

// Health filtering: >50% error rate filtered out
test("selectProvider filters providers with >50% error rate", () => {
  const unhealthy = makeCandidate("unhealthy", 0.0001, 10, 0.6);
  const healthy = makeCandidate("healthy", 0.01, 200, 0.1);
  const result = selectProvider([unhealthy, healthy], "cheapest");
  return result?.provider.id === "healthy";
});

test("selectProvider falls back to all when all are unhealthy", () => {
  const a = makeCandidate("a", 0.01, 100, 0.8);
  const b = makeCandidate("b", 0.001, 100, 0.9);
  const result = selectProvider([a, b], "cheapest");
  // Both are unhealthy, so fallback to all; cheapest of the two is "b"
  return result?.provider.id === "b";
});

// Unknown strategy defaults to first element
test("selectProvider with unknown strategy returns first from pool", () => {
  const a = makeCandidate("first", 0.01, 100, 0);
  const b = makeCandidate("second", 0.001, 50, 0);
  const result = selectProvider([a, b], "unknown" as RoutingStrategy);
  return result?.provider.id === "first";
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
