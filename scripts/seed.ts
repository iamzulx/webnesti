import "dotenv/config";
import { getDb, dbRun, dbGet } from "../src/db/index.js";

async function seed() {
  await getDb();
  console.log("[seed] Seeding 2026-only providers and models...");

  const providers = [
    { id: "openai", displayName: "OpenAI", baseUrl: "https://api.openai.com/v1", authType: "bearer", priority: 100 },
    { id: "anthropic", displayName: "Anthropic", baseUrl: "https://api.anthropic.com/v1", authType: "bearer", priority: 100 },
    { id: "google", displayName: "Google AI", baseUrl: "https://generativelanguage.googleapis.com/v1beta", authType: "bearer", priority: 100 },
    { id: "deepseek", displayName: "DeepSeek", baseUrl: "https://api.deepseek.com", authType: "bearer", priority: 110 },
    { id: "xai", displayName: "xAI (Grok)", baseUrl: "https://api.x.ai/v1", authType: "bearer", priority: 115 },
    { id: "meta", displayName: "Meta (Llama)", baseUrl: "https://api.together.xyz/v1", authType: "bearer", priority: 120 },
    { id: "mistral", displayName: "Mistral AI", baseUrl: "https://api.mistral.ai/v1", authType: "bearer", priority: 110 },
    { id: "cohere", displayName: "Cohere", baseUrl: "https://api.cohere.com/v2", authType: "bearer", priority: 115 },
    { id: "moonshot", displayName: "Moonshot (Kimi)", baseUrl: "https://api.moonshot.cn/v1", authType: "bearer", priority: 125 },
    { id: "zai", displayName: "Z.AI (GLM)", baseUrl: "https://open.bigmodel.cn/api/paas/v4", authType: "bearer", priority: 125 },
    { id: "qwen", displayName: "Alibaba Qwen", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", authType: "bearer", priority: 120 },
    { id: "minimax", displayName: "MiniMax", baseUrl: "https://api.minimax.chat/v1", authType: "bearer", priority: 125 },
    { id: "groq", displayName: "Groq", baseUrl: "https://api.groq.com/openai/v1", authType: "bearer", priority: 125 },
    { id: "cerebras", displayName: "Cerebras", baseUrl: "https://api.cerebras.ai/v1", authType: "bearer", priority: 125 },
    { id: "sambanova", displayName: "SambaNova", baseUrl: "https://api.sambanova.ai/v1", authType: "bearer", priority: 130 },
    { id: "fireworks", displayName: "Fireworks AI", baseUrl: "https://api.fireworks.ai/inference/v1", authType: "bearer", priority: 125 },
    { id: "together", displayName: "Together AI", baseUrl: "https://api.together.xyz/v1", authType: "bearer", priority: 120 },
    { id: "perplexity", displayName: "Perplexity", baseUrl: "https://api.perplexity.ai", authType: "bearer", priority: 120 },
  ];

  for (const p of providers) {
    const existing = dbGet("SELECT id FROM providers WHERE id = ?", [p.id]);
    if (!existing) {
      dbRun("INSERT INTO providers (id, display_name, base_url, auth_type, priority) VALUES (?, ?, ?, ?, ?)",
        [p.id, p.displayName, p.baseUrl, p.authType, p.priority]);
      console.log(`  [+] Provider: ${p.id}`);
    }
  }

  // 2026-ONLY models — verified from official sources (June 2026)
  const models = [
    // === OpenAI 2026 ===
    { id: "openai/gpt-5.5", providerId: "openai", displayName: "GPT-5.5", contextLength: 1000000, priceIn: 5e-6, priceOut: 3e-5, streaming: true, vision: true, tools: true },
    { id: "openai/gpt-5.4", providerId: "openai", displayName: "GPT-5.4", contextLength: 1000000, priceIn: 2.5e-6, priceOut: 1.5e-5, streaming: true, vision: true, tools: true },
    { id: "openai/gpt-5.4-mini", providerId: "openai", displayName: "GPT-5.4 Mini", contextLength: 400000, priceIn: 7.5e-7, priceOut: 4.5e-6, streaming: true, vision: true, tools: true },
    { id: "openai/gpt-5.3-instant", providerId: "openai", displayName: "GPT-5.3 Instant", contextLength: 1000000, priceIn: 5e-7, priceOut: 2e-6, streaming: true, vision: true, tools: true },
    { id: "openai/gpt-5.3-codex", providerId: "openai", displayName: "GPT-5.3 Codex", contextLength: 200000, priceIn: 1.5e-6, priceOut: 6e-6, streaming: true, vision: false, tools: true },

    // === Anthropic 2026 ===
    { id: "anthropic/claude-fable-5", providerId: "anthropic", displayName: "Claude Fable 5", contextLength: 1000000, priceIn: 1e-5, priceOut: 5e-5, streaming: true, vision: true, tools: true },
    { id: "anthropic/claude-opus-4-8", providerId: "anthropic", displayName: "Claude Opus 4.8", contextLength: 1000000, priceIn: 5e-6, priceOut: 2.5e-5, streaming: true, vision: true, tools: true },
    { id: "anthropic/claude-sonnet-4-7", providerId: "anthropic", displayName: "Claude Sonnet 4.7", contextLength: 1000000, priceIn: 3e-6, priceOut: 1.5e-5, streaming: true, vision: true, tools: true },
    { id: "anthropic/claude-opus-4-7", providerId: "anthropic", displayName: "Claude Opus 4.7", contextLength: 200000, priceIn: 1.5e-5, priceOut: 7.5e-5, streaming: true, vision: true, tools: true },
    { id: "anthropic/claude-sonnet-4-6", providerId: "anthropic", displayName: "Claude Sonnet 4.6", contextLength: 1000000, priceIn: 3e-6, priceOut: 1.5e-5, streaming: true, vision: true, tools: true },
    { id: "anthropic/claude-haiku-4-7", providerId: "anthropic", displayName: "Claude Haiku 4.7", contextLength: 200000, priceIn: 1e-6, priceOut: 5e-6, streaming: true, vision: true, tools: true },
    { id: "anthropic/claude-haiku-4-5", providerId: "anthropic", displayName: "Claude Haiku 4.5", contextLength: 200000, priceIn: 1e-6, priceOut: 5e-6, streaming: true, vision: true, tools: true },

    // === Google 2026 ===
    { id: "google/gemini-3.5-flash", providerId: "google", displayName: "Gemini 3.5 Flash", contextLength: 1048576, priceIn: 1.5e-6, priceOut: 9e-6, streaming: true, vision: true, tools: true },
    { id: "google/gemini-3.1-pro", providerId: "google", displayName: "Gemini 3.1 Pro", contextLength: 1048576, priceIn: 2e-6, priceOut: 1.2e-5, streaming: true, vision: true, tools: true },
    { id: "google/gemini-3.1-flash-lite", providerId: "google", displayName: "Gemini 3.1 Flash-Lite", contextLength: 1048576, priceIn: 1e-7, priceOut: 4e-7, streaming: true, vision: true, tools: false },
    { id: "google/gemini-3-flash", providerId: "google", displayName: "Gemini 3 Flash", contextLength: 1048576, priceIn: 1e-7, priceOut: 4e-7, streaming: true, vision: true, tools: true },
    { id: "google/gemini-2.5-pro", providerId: "google", displayName: "Gemini 2.5 Pro", contextLength: 1048576, priceIn: 1.25e-6, priceOut: 1e-5, streaming: true, vision: true, tools: true },
    { id: "google/gemini-2.5-flash", providerId: "google", displayName: "Gemini 2.5 Flash", contextLength: 1048576, priceIn: 1.5e-7, priceOut: 6e-7, streaming: true, vision: true, tools: true },
    { id: "google/gemini-2.5-flash-lite", providerId: "google", displayName: "Gemini 2.5 Flash-Lite", contextLength: 1048576, priceIn: 7.5e-8, priceOut: 3e-7, streaming: true, vision: true, tools: false },

    // === DeepSeek 2026 ===
    { id: "deepseek/deepseek-v4-pro", providerId: "deepseek", displayName: "DeepSeek V4 Pro", contextLength: 128000, priceIn: 2.7e-7, priceOut: 1.1e-6, streaming: true, vision: false, tools: true },
    { id: "deepseek/deepseek-v4-flash", providerId: "deepseek", displayName: "DeepSeek V4 Flash", contextLength: 128000, priceIn: 1.4e-7, priceOut: 2.8e-7, streaming: true, vision: false, tools: true },

    // === xAI 2026 ===
    { id: "xai/grok-4.3", providerId: "xai", displayName: "Grok 4.3", contextLength: 131072, priceIn: 3e-6, priceOut: 1.5e-5, streaming: true, vision: true, tools: true },
    { id: "xai/grok-4-fast", providerId: "xai", displayName: "Grok 4 Fast", contextLength: 131072, priceIn: 5e-7, priceOut: 2e-6, streaming: true, vision: true, tools: true },

    // === Meta 2026 (via Together) ===
    { id: "meta/llama-4-maverick", providerId: "meta", displayName: "Llama 4 Maverick", contextLength: 1000000, priceIn: 2e-7, priceOut: 2e-7, streaming: true, vision: true, tools: true },
    { id: "meta/llama-4-scout", providerId: "meta", displayName: "Llama 4 Scout", contextLength: 10000000, priceIn: 1.5e-7, priceOut: 1.5e-7, streaming: true, vision: true, tools: true },

    // === Mistral 2026 ===
    { id: "mistral/mistral-large-latest", providerId: "mistral", displayName: "Mistral Large", contextLength: 128000, priceIn: 2e-6, priceOut: 6e-6, streaming: true, vision: false, tools: true },
    { id: "mistral/mistral-small-latest", providerId: "mistral", displayName: "Mistral Small", contextLength: 128000, priceIn: 2e-7, priceOut: 6e-7, streaming: true, vision: false, tools: true },
    { id: "mistral/codestral-latest", providerId: "mistral", displayName: "Codestral", contextLength: 32000, priceIn: 1e-6, priceOut: 3e-6, streaming: true, vision: false, tools: false },
    { id: "mistral/pixtral-large-latest", providerId: "mistral", displayName: "Pixtral Large", contextLength: 128000, priceIn: 2e-6, priceOut: 6e-6, streaming: true, vision: true, tools: true },

    // === Cohere 2026 ===
    { id: "cohere/command-a", providerId: "cohere", displayName: "Command A", contextLength: 256000, priceIn: 2.5e-6, priceOut: 1e-5, streaming: true, vision: false, tools: true },
    { id: "cohere/north-mini-code-1.0", providerId: "cohere", displayName: "North Mini Code 1.0", contextLength: 128000, priceIn: 1e-7, priceOut: 3e-7, streaming: true, vision: false, tools: false },

    // === Moonshot 2026 ===
    { id: "moonshot/kimi-k2.7-code", providerId: "moonshot", displayName: "Kimi K2.7 Code", contextLength: 128000, priceIn: 3e-6, priceOut: 1.2e-5, streaming: true, vision: false, tools: true },
    { id: "moonshot/kimi-k2.6", providerId: "moonshot", displayName: "Kimi K2.6", contextLength: 128000, priceIn: 3e-6, priceOut: 1.2e-5, streaming: true, vision: false, tools: true },

    // === Z.AI 2026 ===
    { id: "zai/glm-5.2", providerId: "zai", displayName: "GLM-5.2", contextLength: 128000, priceIn: 5e-5, priceOut: 5e-5, streaming: true, vision: true, tools: true },
    { id: "zai/glm-5-turbo", providerId: "zai", displayName: "GLM-5 Turbo", contextLength: 128000, priceIn: 1e-5, priceOut: 1e-5, streaming: true, vision: true, tools: true },
    { id: "zai/glm-4.7-flash", providerId: "zai", displayName: "GLM-4.7 Flash", contextLength: 128000, priceIn: 5e-6, priceOut: 5e-6, streaming: true, vision: true, tools: true },

    // === Qwen 2026 ===
    { id: "qwen/qwen-3.6-9b", providerId: "qwen", displayName: "Qwen 3.6-9B", contextLength: 131072, priceIn: 3e-7, priceOut: 6e-7, streaming: true, vision: false, tools: true },
    { id: "qwen/qwen-3.5-plus", providerId: "qwen", displayName: "Qwen 3.5 Plus", contextLength: 131072, priceIn: 8e-7, priceOut: 2e-6, streaming: true, vision: true, tools: true },
    { id: "qwen/qwen-max", providerId: "qwen", displayName: "Qwen Max", contextLength: 32768, priceIn: 1.6e-5, priceOut: 6.4e-5, streaming: true, vision: true, tools: true },

    // === MiniMax 2026 ===
    { id: "minimax/MiniMax-Text-01", providerId: "minimax", displayName: "MiniMax Text 01", contextLength: 1000000, priceIn: 1e-6, priceOut: 1e-6, streaming: true, vision: false, tools: false },

    // === Groq (inference, uses 2026 models) ===
    { id: "groq/llama-4-maverick", providerId: "groq", displayName: "Llama 4 Maverick (Groq)", contextLength: 1000000, priceIn: 2e-7, priceOut: 2e-7, streaming: true, vision: true, tools: true },
    { id: "groq/deepseek-v4-flash", providerId: "groq", displayName: "DeepSeek V4 Flash (Groq)", contextLength: 128000, priceIn: 1.4e-7, priceOut: 2.8e-7, streaming: true, vision: false, tools: true },

    // === Cerebras (inference) ===
    { id: "cerebras/llama-4-scout", providerId: "cerebras", displayName: "Llama 4 Scout (Cerebras)", contextLength: 10000000, priceIn: 1.5e-7, priceOut: 1.5e-7, streaming: true, vision: false, tools: false },

    // === SambaNova (inference) ===
    { id: "sambanova/deepseek-v4-pro", providerId: "sambanova", displayName: "DeepSeek V4 Pro (SambaNova)", contextLength: 128000, priceIn: 2.7e-7, priceOut: 1.1e-6, streaming: true, vision: false, tools: false },

    // === Fireworks (inference) ===
    { id: "fireworks/llama-4-maverick", providerId: "fireworks", displayName: "Llama 4 Maverick (Fireworks)", contextLength: 1000000, priceIn: 2e-7, priceOut: 2e-7, streaming: true, vision: true, tools: false },

    // === Together (inference) ===
    { id: "together/llama-4-maverick", providerId: "together", displayName: "Llama 4 Maverick (Together)", contextLength: 1000000, priceIn: 2e-7, priceOut: 2e-7, streaming: true, vision: true, tools: true },
    { id: "together/llama-4-scout", providerId: "together", displayName: "Llama 4 Scout (Together)", contextLength: 10000000, priceIn: 1.5e-7, priceOut: 1.5e-7, streaming: true, vision: true, tools: true },

    // === Perplexity (search-augmented) ===
    { id: "perplexity/sonar-pro", providerId: "perplexity", displayName: "Sonar Pro", contextLength: 200000, priceIn: 3e-6, priceOut: 1.5e-5, streaming: true, vision: true, tools: false },
    { id: "perplexity/sonar", providerId: "perplexity", displayName: "Sonar", contextLength: 200000, priceIn: 1e-6, priceOut: 1e-6, streaming: true, vision: true, tools: false },
  ];

  // Deactivate all, then activate 2026-only
  dbRun("UPDATE models SET is_active = 0");
  for (const m of models) {
    const existing = dbGet("SELECT id FROM models WHERE id = ?", [m.id]);
    if (existing) {
      dbRun("UPDATE models SET is_active = 1, display_name = ?, pricing_input = ?, pricing_output = ?, context_length = ? WHERE id = ?",
        [m.displayName, m.priceIn, m.priceOut, m.contextLength, m.id]);
    } else {
      dbRun("INSERT INTO models (id, provider_id, display_name, context_length, pricing_input, pricing_output, supports_streaming, supports_vision, supports_tools, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
        [m.id, m.providerId, m.displayName, m.contextLength, m.priceIn, m.priceOut, m.streaming ? 1 : 0, m.vision ? 1 : 0, m.tools ? 1 : 0]);
    }
    console.log(`  [✓] ${m.id}`);
  }

  console.log(`\n[seed] Done! ${providers.length} providers, ${models.length} models (2026-only)`);
  process.exit(0);
}

seed().catch((err) => { console.error("Seed failed:", err); process.exit(1); });
