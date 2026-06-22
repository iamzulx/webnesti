import { Hono } from "hono";
import { getAllProviders } from "../providers/index.js";
import { getAllMetrics } from "../routing/strategies.js";

const status = new Hono();

// GET /v1/status — public provider health snapshot. Combines the set of loaded
// providers (have an API key configured) with live routing metrics collected
// from real requests. No auth: this is a transparency surface, like a status
// page. Returns no secrets — only ids, availability, latency, and error rate.
status.get("/", (c) => {
  const providers = getAllProviders();
  const metrics = getAllMetrics();

  const data = providers.map((p) => {
    const m = metrics[p.id];
    const total = m?.totalRequests || 0;
    const errorRate = m?.errorRate ?? 0;
    // Health is derived: configured but unproven = "unknown"; >50% errors =
    // "degraded"; otherwise "operational".
    let health: "operational" | "degraded" | "unknown";
    if (total === 0) health = "unknown";
    else if (errorRate >= 0.5) health = "degraded";
    else health = "operational";

    return {
      id: p.id,
      name: p.name,
      available: p.isAvailable(),
      health,
      total_requests: total,
      success_rate: total > 0 ? Math.round((1 - errorRate) * 1000) / 1000 : null,
      avg_latency_ms: m ? Math.round(m.avgLatencyMs) : null,
      last_used: m?.lastUsed || null,
    };
  });

  const operational = data.filter((d) => d.health === "operational").length;
  return c.json({
    object: "status",
    summary: {
      providers_loaded: data.length,
      operational,
      degraded: data.filter((d) => d.health === "degraded").length,
      unknown: data.filter((d) => d.health === "unknown").length,
    },
    providers: data,
  });
});

export default status;
