import { Hono } from "hono";
import { dbAll, dbGet } from "../db/index.js";
import { getCache, setCache } from "../cache.js";

const models = new Hono();

// Round to 6 sig-figs to avoid float noise like 10.000000000000002.
const perMillion = (perToken: number) => Math.round((perToken || 0) * 1_000_000 * 1e6) / 1e6;

// Map a DB row to the public model shape. Pricing is normalized to USD per 1M
// tokens (the unit every aggregator compares on) while keeping the raw
// per-token values for OpenAI-compatible clients. Modalities are derived from
// real capability flags — no fields are emitted that we don't have data for.
function formatModel(m: any) {
  let meta: any = {};
  if (m.metadata) { try { meta = JSON.parse(m.metadata); } catch { /* ignore */ } }
  const inputModalities = ["text", ...(m.supports_vision ? ["image"] : [])];
  return {
    id: m.id,
    object: "model",
    created: meta.created || 0,
    owned_by: m.provider_id,
    display_name: m.display_name,
    context_length: m.context_length,
    input_modalities: inputModalities,
    output_modalities: ["text"],
    capabilities: {
      streaming: !!m.supports_streaming,
      vision: !!m.supports_vision,
      tools: !!m.supports_tools,
    },
    pricing: {
      // Raw per-token (OpenAI-compatible ecosystem expectation).
      prompt: m.pricing_input,
      completion: m.pricing_output,
      // Human-comparable, the unit aggregator users actually shop on.
      prompt_per_million: perMillion(m.pricing_input),
      completion_per_million: perMillion(m.pricing_output),
      currency: "USD",
    },
    ...(meta.description ? { description: meta.description } : {}),
  };
}

type FormattedModel = ReturnType<typeof formatModel>;

function baseList(): FormattedModel[] {
  const cached = getCache<FormattedModel[]>("models:list:v2");
  if (cached) return cached;
  const rows = dbAll("SELECT * FROM models WHERE is_active = 1 ORDER BY provider_id, id");
  const data = rows.map(formatModel);
  setCache("models:list:v2", data, 60_000, ["models"]);
  return data;
}

// GET /v1/models — supports server-side filtering + sorting so clients don't
// pull the whole catalog and filter locally. All filters are optional.
//   ?q=            free-text on id/display_name
//   ?providers=    comma-separated provider ids (e.g. openai,anthropic)
//   ?vision=true   only vision-capable
//   ?tools=true    only tool-capable
//   ?min_context=  minimum context length (tokens)
//   ?max_price=    max prompt price in $/1M tokens
//   ?sort=         pricing-low-to-high | pricing-high-to-low | context-high-to-low | name
models.get("/", (c) => {
  let data = baseList();
  const q = c.req.query("q")?.toLowerCase();
  const providers = c.req.query("providers")?.split(",").map((p) => p.trim()).filter(Boolean);
  const vision = c.req.query("vision");
  const tools = c.req.query("tools");
  const minContext = c.req.query("min_context");
  const maxPrice = c.req.query("max_price");
  const sort = c.req.query("sort");

  if (q) data = data.filter((m) => m.id.toLowerCase().includes(q) || (m.display_name || "").toLowerCase().includes(q));
  if (providers?.length) data = data.filter((m) => providers.includes(m.owned_by));
  if (vision === "true") data = data.filter((m) => m.capabilities.vision);
  if (tools === "true") data = data.filter((m) => m.capabilities.tools);
  if (minContext) { const n = Number(minContext); if (!Number.isNaN(n)) data = data.filter((m) => (m.context_length || 0) >= n); }
  if (maxPrice) { const n = Number(maxPrice); if (!Number.isNaN(n)) data = data.filter((m) => m.pricing.prompt_per_million <= n); }

  // Copy before sort — baseList() is a shared cached array, never mutate it.
  if (sort) {
    data = [...data];
    switch (sort) {
      case "pricing-low-to-high": data.sort((a, b) => a.pricing.prompt_per_million - b.pricing.prompt_per_million); break;
      case "pricing-high-to-low": data.sort((a, b) => b.pricing.prompt_per_million - a.pricing.prompt_per_million); break;
      case "context-high-to-low": data.sort((a, b) => (b.context_length || 0) - (a.context_length || 0)); break;
      case "name": data.sort((a, b) => (a.display_name || a.id).localeCompare(b.display_name || b.id)); break;
    }
  }

  return c.json({ object: "list", data });
});

// GET /v1/models/:id
models.get("/:id{.+}", (c) => {
  const modelId = c.req.param("id");
  const m = dbGet("SELECT * FROM models WHERE id = ?", [modelId]);
  if (!m) {
    return c.json({ error: { message: `Model '${modelId}' not found`, type: "invalid_request_error" } }, 404);
  }
  return c.json(formatModel(m));
});

export default models;
