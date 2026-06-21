import "dotenv/config";
import { getDb, dbRun, dbGet } from "../src/db/index.js";

async function seed() {
  await getDb();
  console.log("[seed] Seeding providers and models...");

  // Providers
  const providers = [
    { id: "openai", displayName: "OpenAI", baseUrl: "https://api.openai.com/v1", authType: "bearer", priority: 100 },
    { id: "anthropic", displayName: "Anthropic", baseUrl: "https://api.anthropic.com/v1", authType: "bearer", priority: 100 },
    { id: "google", displayName: "Google AI", baseUrl: "https://generativelanguage.googleapis.com/v1beta", authType: "bearer", priority: 100 },
    { id: "deepseek", displayName: "DeepSeek", baseUrl: "https://api.deepseek.com", authType: "bearer", priority: 110 },
    { id: "meta", displayName: "Meta (Llama)", baseUrl: "https://api.together.xyz/v1", authType: "bearer", priority: 120 },
    { id: "xai", displayName: "xAI (Grok)", baseUrl: "https://api.x.ai/v1", authType: "bearer", priority: 115 },
    { id: "mistral", displayName: "Mistral AI", baseUrl: "https://api.mistral.ai/v1", authType: "bearer", priority: 110 },
  ];

  for (const p of providers) {
    const existing = dbGet("SELECT id FROM providers WHERE id = ?", [p.id]);
    if (!existing) {
      dbRun("INSERT INTO providers (id, display_name, base_url, auth_type, priority) VALUES (?, ?, ?, ?, ?)",
        [p.id, p.displayName, p.baseUrl, p.authType, p.priority]);
      console.log(`  [+] Provider: ${p.id}`);
    }
  }

  // Models
  const models = [
    // OpenAI
    { id: "openai/gpt-4o", providerId: "openai", displayName: "GPT-4o", contextLength: 128000, priceIn: 2.5e-6, priceOut: 1e-5, streaming: true, vision: true, tools: true },
    { id: "openai/gpt-4o-mini", providerId: "openai", displayName: "GPT-4o Mini", contextLength: 128000, priceIn: 1.5e-7, priceOut: 6e-7, streaming: true, vision: true, tools: true },
    { id: "openai/gpt-4-turbo", providerId: "openai", displayName: "GPT-4 Turbo", contextLength: 128000, priceIn: 1e-5, priceOut: 3e-5, streaming: true, vision: true, tools: true },
    { id: "openai/gpt-3.5-turbo", providerId: "openai", displayName: "GPT-3.5 Turbo", contextLength: 16385, priceIn: 5e-7, priceOut: 1.5e-6, streaming: true, vision: false, tools: true },
    // Anthropic
    { id: "anthropic/claude-sonnet-4-20250514", providerId: "anthropic", displayName: "Claude Sonnet 4", contextLength: 200000, priceIn: 3e-6, priceOut: 1.5e-5, streaming: true, vision: true, tools: true },
    { id: "anthropic/claude-3-5-sonnet-20241022", providerId: "anthropic", displayName: "Claude 3.5 Sonnet", contextLength: 200000, priceIn: 3e-6, priceOut: 1.5e-5, streaming: true, vision: true, tools: true },
    { id: "anthropic/claude-3-5-haiku-20241022", providerId: "anthropic", displayName: "Claude 3.5 Haiku", contextLength: 200000, priceIn: 8e-7, priceOut: 4e-6, streaming: true, vision: true, tools: false },
    { id: "anthropic/claude-3-opus-20240229", providerId: "anthropic", displayName: "Claude 3 Opus", contextLength: 200000, priceIn: 1.5e-5, priceOut: 7.5e-5, streaming: true, vision: true, tools: false },
    // Google
    { id: "google/gemini-2.0-flash", providerId: "google", displayName: "Gemini 2.0 Flash", contextLength: 1048576, priceIn: 1e-7, priceOut: 4e-7, streaming: true, vision: true, tools: true },
    { id: "google/gemini-1.5-pro", providerId: "google", displayName: "Gemini 1.5 Pro", contextLength: 2097152, priceIn: 1.25e-6, priceOut: 5e-6, streaming: true, vision: true, tools: true },
    // DeepSeek
    { id: "deepseek/deepseek-chat", providerId: "deepseek", displayName: "DeepSeek Chat", contextLength: 65536, priceIn: 1.4e-7, priceOut: 2.8e-7, streaming: true, vision: false, tools: true },
    { id: "deepseek/deepseek-reasoner", providerId: "deepseek", displayName: "DeepSeek Reasoner", contextLength: 65536, priceIn: 5.5e-7, priceOut: 2.19e-6, streaming: true, vision: false, tools: false },
    // Meta
    { id: "meta/llama-3.1-70b", providerId: "meta", displayName: "Llama 3.1 70B", contextLength: 131072, priceIn: 8.8e-7, priceOut: 8.8e-7, streaming: true, vision: false, tools: false },
    { id: "meta/llama-3.1-8b", providerId: "meta", displayName: "Llama 3.1 8B", contextLength: 131072, priceIn: 2e-7, priceOut: 2e-7, streaming: true, vision: false, tools: false },
    // xAI
    { id: "xai/grok-2", providerId: "xai", displayName: "Grok 2", contextLength: 131072, priceIn: 2e-6, priceOut: 1e-5, streaming: true, vision: true, tools: true },
    { id: "xai/grok-2-mini", providerId: "xai", displayName: "Grok 2 Mini", contextLength: 131072, priceIn: 3e-7, priceOut: 5e-7, streaming: true, vision: false, tools: false },
    // Mistral
    { id: "mistral/mistral-large-latest", providerId: "mistral", displayName: "Mistral Large", contextLength: 128000, priceIn: 2e-6, priceOut: 6e-6, streaming: true, vision: false, tools: true },
    { id: "mistral/mistral-small-latest", providerId: "mistral", displayName: "Mistral Small", contextLength: 128000, priceIn: 2e-7, priceOut: 6e-7, streaming: true, vision: false, tools: true },
    { id: "mistral/codestral-latest", providerId: "mistral", displayName: "Codestral", contextLength: 32000, priceIn: 1e-6, priceOut: 3e-6, streaming: true, vision: false, tools: false },
  ];

  for (const m of models) {
    const existing = dbGet("SELECT id FROM models WHERE id = ?", [m.id]);
    if (!existing) {
      dbRun("INSERT INTO models (id, provider_id, display_name, context_length, pricing_input, pricing_output, supports_streaming, supports_vision, supports_tools) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [m.id, m.providerId, m.displayName, m.contextLength, m.priceIn, m.priceOut, m.streaming ? 1 : 0, m.vision ? 1 : 0, m.tools ? 1 : 0]);
      console.log(`  [+] Model: ${m.id}`);
    }
  }

  console.log("[seed] Done!");
  process.exit(0);
}

seed().catch((err) => { console.error("Seed failed:", err); process.exit(1); });
