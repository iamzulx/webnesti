import "dotenv/config";
import { getDb, dbRun, dbGet } from "../src/db/index.js";

async function seed() {
  await getDb();
  console.log("[seed] Seeding providers and models...");

  // Providers (18)
  const providers = [
    { id: "openai", displayName: "OpenAI", baseUrl: "https://api.openai.com/v1", authType: "bearer", priority: 100 },
    { id: "anthropic", displayName: "Anthropic", baseUrl: "https://api.anthropic.com/v1", authType: "bearer", priority: 100 },
    { id: "google", displayName: "Google AI", baseUrl: "https://generativelanguage.googleapis.com/v1beta", authType: "bearer", priority: 100 },
    { id: "deepseek", displayName: "DeepSeek", baseUrl: "https://api.deepseek.com", authType: "bearer", priority: 110 },
    { id: "meta", displayName: "Meta (Llama)", baseUrl: "https://api.together.xyz/v1", authType: "bearer", priority: 120 },
    { id: "xai", displayName: "xAI (Grok)", baseUrl: "https://api.x.ai/v1", authType: "bearer", priority: 115 },
    { id: "mistral", displayName: "Mistral AI", baseUrl: "https://api.mistral.ai/v1", authType: "bearer", priority: 110 },
    { id: "cohere", displayName: "Cohere", baseUrl: "https://api.cohere.com/v2", authType: "bearer", priority: 115 },
    { id: "groq", displayName: "Groq", baseUrl: "https://api.groq.com/openai/v1", authType: "bearer", priority: 125 },
    { id: "cerebras", displayName: "Cerebras", baseUrl: "https://api.cerebras.ai/v1", authType: "bearer", priority: 125 },
    { id: "sambanova", displayName: "SambaNova", baseUrl: "https://api.sambanova.ai/v1", authType: "bearer", priority: 130 },
    { id: "fireworks", displayName: "Fireworks AI", baseUrl: "https://api.fireworks.ai/inference/v1", authType: "bearer", priority: 125 },
    { id: "together", displayName: "Together AI", baseUrl: "https://api.together.xyz/v1", authType: "bearer", priority: 120 },
    { id: "perplexity", displayName: "Perplexity", baseUrl: "https://api.perplexity.ai", authType: "bearer", priority: 120 },
    { id: "moonshot", displayName: "Moonshot (Kimi)", baseUrl: "https://api.moonshot.cn/v1", authType: "bearer", priority: 125 },
    { id: "zai", displayName: "Z.AI (GLM)", baseUrl: "https://open.bigmodel.cn/api/paas/v4", authType: "bearer", priority: 125 },
    { id: "minimax", displayName: "MiniMax", baseUrl: "https://api.minimax.chat/v1", authType: "bearer", priority: 125 },
    { id: "qwen", displayName: "Alibaba Qwen", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", authType: "bearer", priority: 120 },
  ];

  for (const p of providers) {
    const existing = dbGet("SELECT id FROM providers WHERE id = ?", [p.id]);
    if (!existing) {
      dbRun("INSERT INTO providers (id, display_name, base_url, auth_type, priority) VALUES (?, ?, ?, ?, ?)",
        [p.id, p.displayName, p.baseUrl, p.authType, p.priority]);
      console.log(`  [+] Provider: ${p.id}`);
    }
  }

  // Models — ALL latest from each provider (June 2026)
  const models = [
    // === OpenAI (latest 2026) ===
    { id: "openai/gpt-5.5", providerId: "openai", displayName: "GPT-5.5", contextLength: 1000000, priceIn: 5e-6, priceOut: 3e-5, streaming: true, vision: true, tools: true },
    { id: "openai/gpt-5.4", providerId: "openai", displayName: "GPT-5.4", contextLength: 1000000, priceIn: 2.5e-6, priceOut: 1.5e-5, streaming: true, vision: true, tools: true },
    { id: "openai/gpt-5.4-mini", providerId: "openai", displayName: "GPT-5.4 Mini", contextLength: 400000, priceIn: 7.5e-7, priceOut: 4.5e-6, streaming: true, vision: true, tools: true },
    { id: "openai/gpt-4.1", providerId: "openai", displayName: "GPT-4.1", contextLength: 1000000, priceIn: 2e-6, priceOut: 8e-6, streaming: true, vision: true, tools: true },
    { id: "openai/gpt-4.1-mini", providerId: "openai", displayName: "GPT-4.1 Mini", contextLength: 1000000, priceIn: 4e-7, priceOut: 1.6e-6, streaming: true, vision: true, tools: true },
    { id: "openai/gpt-4.1-nano", providerId: "openai", displayName: "GPT-4.1 Nano", contextLength: 1000000, priceIn: 1e-7, priceOut: 4e-7, streaming: true, vision: true, tools: true },
    { id: "openai/o3", providerId: "openai", displayName: "o3", contextLength: 200000, priceIn: 2e-5, priceOut: 8e-5, streaming: true, vision: true, tools: true },
    { id: "openai/o4-mini", providerId: "openai", displayName: "o4-mini", contextLength: 200000, priceIn: 1.1e-6, priceOut: 4.4e-6, streaming: true, vision: true, tools: true },
    { id: "openai/gpt-4o", providerId: "openai", displayName: "GPT-4o", contextLength: 128000, priceIn: 2.5e-6, priceOut: 1e-5, streaming: true, vision: true, tools: true },
    { id: "openai/gpt-4o-mini", providerId: "openai", displayName: "GPT-4o Mini", contextLength: 128000, priceIn: 1.5e-7, priceOut: 6e-7, streaming: true, vision: true, tools: true },

    // === Anthropic (latest 2026) ===
    { id: "anthropic/claude-fable-5", providerId: "anthropic", displayName: "Claude Fable 5", contextLength: 1000000, priceIn: 1e-5, priceOut: 5e-5, streaming: true, vision: true, tools: true },
    { id: "anthropic/claude-opus-4-8", providerId: "anthropic", displayName: "Claude Opus 4.8", contextLength: 1000000, priceIn: 5e-6, priceOut: 2.5e-5, streaming: true, vision: true, tools: true },
    { id: "anthropic/claude-sonnet-4-6", providerId: "anthropic", displayName: "Claude Sonnet 4.6", contextLength: 1000000, priceIn: 3e-6, priceOut: 1.5e-5, streaming: true, vision: true, tools: true },
    { id: "anthropic/claude-haiku-4-5", providerId: "anthropic", displayName: "Claude Haiku 4.5", contextLength: 200000, priceIn: 1e-6, priceOut: 5e-6, streaming: true, vision: true, tools: true },
    { id: "anthropic/claude-opus-4-7", providerId: "anthropic", displayName: "Claude Opus 4.7", contextLength: 200000, priceIn: 1.5e-5, priceOut: 7.5e-5, streaming: true, vision: true, tools: true },
    { id: "anthropic/claude-sonnet-4-5", providerId: "anthropic", displayName: "Claude Sonnet 4.5", contextLength: 200000, priceIn: 3e-6, priceOut: 1.5e-5, streaming: true, vision: true, tools: true },

    // === Google Gemini (latest 2026) ===
    { id: "google/gemini-2.5-pro", providerId: "google", displayName: "Gemini 2.5 Pro", contextLength: 1048576, priceIn: 1.25e-6, priceOut: 1e-5, streaming: true, vision: true, tools: true },
    { id: "google/gemini-2.5-flash", providerId: "google", displayName: "Gemini 2.5 Flash", contextLength: 1048576, priceIn: 1.5e-7, priceOut: 6e-7, streaming: true, vision: true, tools: true },
    { id: "google/gemini-2.5-flash-lite", providerId: "google", displayName: "Gemini 2.5 Flash-Lite", contextLength: 1048576, priceIn: 7.5e-8, priceOut: 3e-7, streaming: true, vision: true, tools: false },
    { id: "google/gemini-2.0-flash", providerId: "google", displayName: "Gemini 2.0 Flash", contextLength: 1048576, priceIn: 1e-7, priceOut: 4e-7, streaming: true, vision: true, tools: true },

    // === DeepSeek ===
    { id: "deepseek/deepseek-chat", providerId: "deepseek", displayName: "DeepSeek Chat (V4)", contextLength: 65536, priceIn: 1.4e-7, priceOut: 2.8e-7, streaming: true, vision: false, tools: true },
    { id: "deepseek/deepseek-reasoner", providerId: "deepseek", displayName: "DeepSeek Reasoner", contextLength: 65536, priceIn: 5.5e-7, priceOut: 2.19e-6, streaming: true, vision: false, tools: false },

    // === Meta (via Together) ===
    { id: "meta/llama-3.3-70b", providerId: "meta", displayName: "Llama 3.3 70B", contextLength: 128000, priceIn: 8.8e-7, priceOut: 8.8e-7, streaming: true, vision: false, tools: true },
    { id: "meta/llama-3.1-405b", providerId: "meta", displayName: "Llama 3.1 405B", contextLength: 128000, priceIn: 3.5e-6, priceOut: 3.5e-6, streaming: true, vision: false, tools: true },
    { id: "meta/llama-3.1-70b", providerId: "meta", displayName: "Llama 3.1 70B", contextLength: 128000, priceIn: 8.8e-7, priceOut: 8.8e-7, streaming: true, vision: false, tools: true },
    { id: "meta/llama-3.1-8b", providerId: "meta", displayName: "Llama 3.1 8B", contextLength: 128000, priceIn: 2e-7, priceOut: 2e-7, streaming: true, vision: false, tools: false },

    // === xAI ===
    { id: "xai/grok-3", providerId: "xai", displayName: "Grok 3", contextLength: 131072, priceIn: 3e-6, priceOut: 1.5e-5, streaming: true, vision: true, tools: true },
    { id: "xai/grok-3-mini", providerId: "xai", displayName: "Grok 3 Mini", contextLength: 131072, priceIn: 3e-7, priceOut: 5e-7, streaming: true, vision: false, tools: true },
    { id: "xai/grok-2", providerId: "xai", displayName: "Grok 2", contextLength: 131072, priceIn: 2e-6, priceOut: 1e-5, streaming: true, vision: true, tools: true },

    // === Mistral ===
    { id: "mistral/mistral-large-latest", providerId: "mistral", displayName: "Mistral Large", contextLength: 128000, priceIn: 2e-6, priceOut: 6e-6, streaming: true, vision: false, tools: true },
    { id: "mistral/mistral-small-latest", providerId: "mistral", displayName: "Mistral Small", contextLength: 128000, priceIn: 2e-7, priceOut: 6e-7, streaming: true, vision: false, tools: true },
    { id: "mistral/codestral-latest", providerId: "mistral", displayName: "Codestral", contextLength: 32000, priceIn: 1e-6, priceOut: 3e-6, streaming: true, vision: false, tools: false },
    { id: "mistral/pixtral-large-latest", providerId: "mistral", displayName: "Pixtral Large", contextLength: 128000, priceIn: 2e-6, priceOut: 6e-6, streaming: true, vision: true, tools: true },

    // === Cohere ===
    { id: "cohere/command-a", providerId: "cohere", displayName: "Command A", contextLength: 256000, priceIn: 2.5e-6, priceOut: 1e-5, streaming: true, vision: false, tools: true },
    { id: "cohere/command-r-plus", providerId: "cohere", displayName: "Command R+", contextLength: 128000, priceIn: 2.5e-6, priceOut: 1e-5, streaming: true, vision: false, tools: true },
    { id: "cohere/command-r", providerId: "cohere", displayName: "Command R", contextLength: 128000, priceIn: 1.5e-7, priceOut: 6e-7, streaming: true, vision: false, tools: true },

    // === Groq ===
    { id: "groq/llama-3.3-70b-versatile", providerId: "groq", displayName: "Llama 3.3 70B (Groq)", contextLength: 128000, priceIn: 5.9e-7, priceOut: 7.9e-7, streaming: true, vision: false, tools: true },
    { id: "groq/llama-3.1-8b-instant", providerId: "groq", displayName: "Llama 3.1 8B Instant", contextLength: 128000, priceIn: 5e-8, priceOut: 8e-8, streaming: true, vision: false, tools: false },
    { id: "groq/mixtral-8x7b-32768", providerId: "groq", displayName: "Mixtral 8x7B (Groq)", contextLength: 32768, priceIn: 2.4e-7, priceOut: 2.4e-7, streaming: true, vision: false, tools: false },
    { id: "groq/gemma2-9b-it", providerId: "groq", displayName: "Gemma 2 9B (Groq)", contextLength: 8192, priceIn: 2e-7, priceOut: 2e-7, streaming: true, vision: false, tools: false },

    // === Cerebras ===
    { id: "cerebras/llama3.1-8b", providerId: "cerebras", displayName: "Llama 3.1 8B (Cerebras)", contextLength: 8192, priceIn: 1e-7, priceOut: 1e-7, streaming: true, vision: false, tools: false },
    { id: "cerebras/llama3.1-70b", providerId: "cerebras", displayName: "Llama 3.1 70B (Cerebras)", contextLength: 8192, priceIn: 6e-7, priceOut: 6e-7, streaming: true, vision: false, tools: false },

    // === SambaNova ===
    { id: "sambanova/Meta-Llama-3.1-70B-Instruct", providerId: "sambanova", displayName: "Llama 3.1 70B (SambaNova)", contextLength: 131072, priceIn: 6e-7, priceOut: 6e-7, streaming: true, vision: false, tools: false },
    { id: "sambanova/DeepSeek-V3-0324", providerId: "sambanova", displayName: "DeepSeek V3 (SambaNova)", contextLength: 131072, priceIn: 5e-7, priceOut: 5e-7, streaming: true, vision: false, tools: false },

    // === Fireworks ===
    { id: "fireworks/accounts/fireworks/models/llama-v3p3-70b-instruct", providerId: "fireworks", displayName: "Llama 3.3 70B (Fireworks)", contextLength: 131072, priceIn: 9e-7, priceOut: 9e-7, streaming: true, vision: false, tools: false },
    { id: "fireworks/accounts/fireworks/models/deepseek-v3", providerId: "fireworks", displayName: "DeepSeek V3 (Fireworks)", contextLength: 131072, priceIn: 9e-7, priceOut: 9e-7, streaming: true, vision: false, tools: false },

    // === Together AI ===
    { id: "together/meta-llama/Llama-3.3-70B-Instruct-Turbo", providerId: "together", displayName: "Llama 3.3 70B (Together)", contextLength: 128000, priceIn: 8.8e-7, priceOut: 8.8e-7, streaming: true, vision: false, tools: true },
    { id: "together/deepseek-ai/DeepSeek-V3", providerId: "together", displayName: "DeepSeek V3 (Together)", contextLength: 128000, priceIn: 8.8e-7, priceOut: 8.8e-7, streaming: true, vision: false, tools: false },
    { id: "together/Qwen/Qwen2.5-72B-Instruct-Turbo", providerId: "together", displayName: "Qwen 2.5 72B (Together)", contextLength: 32768, priceIn: 8.8e-7, priceOut: 8.8e-7, streaming: true, vision: false, tools: false },

    // === Perplexity ===
    { id: "perplexity/llama-3.1-sonar-small-128k-online", providerId: "perplexity", displayName: "Sonar Small 128K", contextLength: 128000, priceIn: 2e-7, priceOut: 2e-7, streaming: true, vision: false, tools: false },
    { id: "perplexity/llama-3.1-sonar-large-128k-online", providerId: "perplexity", displayName: "Sonar Large 128K", contextLength: 128000, priceIn: 1e-6, priceOut: 1e-6, streaming: true, vision: false, tools: false },

    // === Moonshot ===
    { id: "moonshot/moonshot-v1-8k", providerId: "moonshot", displayName: "Moonshot v1 8K", contextLength: 8192, priceIn: 1.5e-6, priceOut: 1.5e-6, streaming: true, vision: false, tools: false },
    { id: "moonshot/moonshot-v1-32k", providerId: "moonshot", displayName: "Moonshot v1 32K", contextLength: 32768, priceIn: 4e-6, priceOut: 4e-6, streaming: true, vision: false, tools: false },
    { id: "moonshot/moonshot-v1-128k", providerId: "moonshot", displayName: "Moonshot v1 128K", contextLength: 131072, priceIn: 8e-6, priceOut: 8e-6, streaming: true, vision: false, tools: false },

    // === Z.AI (GLM) ===
    { id: "zai/glm-4-plus", providerId: "zai", displayName: "GLM-4 Plus", contextLength: 128000, priceIn: 5e-5, priceOut: 5e-5, streaming: true, vision: true, tools: true },
    { id: "zai/glm-4-flash", providerId: "zai", displayName: "GLM-4 Flash", contextLength: 128000, priceIn: 1e-4, priceOut: 1e-4, streaming: true, vision: true, tools: true },

    // === MiniMax ===
    { id: "minimax/MiniMax-Text-01", providerId: "minimax", displayName: "MiniMax Text 01", contextLength: 1000000, priceIn: 1e-6, priceOut: 1e-6, streaming: true, vision: false, tools: false },

    // === Qwen (Alibaba) ===
    { id: "qwen/qwen-plus", providerId: "qwen", displayName: "Qwen Plus", contextLength: 131072, priceIn: 8e-7, priceOut: 2e-6, streaming: true, vision: true, tools: true },
    { id: "qwen/qwen-turbo", providerId: "qwen", displayName: "Qwen Turbo", contextLength: 131072, priceIn: 3e-7, priceOut: 6e-7, streaming: true, vision: false, tools: true },
    { id: "qwen/qwen-long", providerId: "qwen", displayName: "Qwen Long", contextLength: 1000000, priceIn: 5e-7, priceOut: 2e-6, streaming: true, vision: false, tools: false },
    { id: "qwen/qwen-max", providerId: "qwen", displayName: "Qwen Max", contextLength: 32768, priceIn: 1.6e-5, priceOut: 6.4e-5, streaming: true, vision: true, tools: true },
  ];

  for (const m of models) {
    const existing = dbGet("SELECT id FROM models WHERE id = ?", [m.id]);
    if (!existing) {
      dbRun("INSERT INTO models (id, provider_id, display_name, context_length, pricing_input, pricing_output, supports_streaming, supports_vision, supports_tools) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [m.id, m.providerId, m.displayName, m.contextLength, m.priceIn, m.priceOut, m.streaming ? 1 : 0, m.vision ? 1 : 0, m.tools ? 1 : 0]);
      console.log(`  [+] Model: ${m.id}`);
    }
  }

  console.log(`[seed] Done! ${providers.length} providers, ${models.length} models`);
  process.exit(0);
}

seed().catch((err) => { console.error("Seed failed:", err); process.exit(1); });
