import { Hono } from "hono";
import { dbAll, dbGet } from "../db/index.js";
import { getCache, setCache, invalidateByTag } from "../cache.js";

const models = new Hono();

// GET /v1/models (cached for 60s, invalidated on model changes)
models.get("/", (c) => {
  const cached = getCache<any[]>("models:list");
  if (cached) return c.json({ object: "list", data: cached });

  const rows = dbAll("SELECT * FROM models WHERE is_active = 1 ORDER BY provider_id, id");
  const data = rows.map((m: any) => ({
    id: m.id, object: "model", created: Math.floor(Date.now() / 1000),
    owned_by: m.provider_id,
    pricing: { prompt: m.pricing_input, completion: m.pricing_output },
    capabilities: { streaming: !!m.supports_streaming, vision: !!m.supports_vision, tools: !!m.supports_tools },
    context_length: m.context_length,
  }));

  setCache("models:list", data, 60_000, ["models"]);
  return c.json({ object: "list", data });
});

// GET /v1/models/:id
models.get("/:id{.+}", (c) => {
  const modelId = c.req.param("id");
  const m = dbGet("SELECT * FROM models WHERE id = ?", [modelId]);

  if (!m) {
    return c.json({ error: { message: `Model '${modelId}' not found`, type: "invalid_request_error" } }, 404);
  }

  return c.json({
    id: m.id, object: "model", created: Math.floor(Date.now() / 1000),
    owned_by: m.provider_id,
    pricing: { prompt: m.pricing_input, completion: m.pricing_output },
    capabilities: { streaming: !!m.supports_streaming, vision: !!m.supports_vision, tools: !!m.supports_tools },
    context_length: m.context_length,
  });
});

export default models;
