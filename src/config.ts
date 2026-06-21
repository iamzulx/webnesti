import "dotenv/config";

const isProduction = process.env.NODE_ENV === "production";

const INSECURE_JWT_SECRETS = new Set([
  "",
  "dev-secret-change-in-production",
  "change-this-to-a-random-secret-in-production",
]);

const jwtSecret = process.env.JWT_SECRET || "dev-secret-change-in-production";

if (isProduction && (INSECURE_JWT_SECRETS.has(jwtSecret) || jwtSecret.length < 32)) {
  throw new Error(
    "JWT_SECRET must be set to a strong, random value (>= 32 chars) in production."
  );
}

const DEFAULT_ENCRYPTION_KEY = "dev-encryption-key-change-me-32b!!";
const encryptionKey = process.env.ENCRYPTION_KEY || DEFAULT_ENCRYPTION_KEY;

if (isProduction && (encryptionKey === DEFAULT_ENCRYPTION_KEY || encryptionKey.length < 32)) {
  throw new Error(
    "ENCRYPTION_KEY must be set to a strong, random value (>= 32 chars) in production."
  );
}

export const config = {
  isProduction,
  port: parseInt(process.env.PORT || "3000"),
  host: process.env.HOST || "0.0.0.0",
  jwtSecret,
  defaultMarkup: parseFloat(process.env.DEFAULT_MARKUP_PERCENT || "10"),
  midtransServerKey: process.env.MIDTRANS_SERVER_KEY || "",
  midtransIsProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  encryptionKey,
  corsOrigins: process.env.CORS_ORIGINS?.split(",").map(s => s.trim()) || ["https://webnesti.ai", "http://localhost:3000"],
  providers: {
    // First-party providers
    openai: { apiKey: process.env.OPENAI_API_KEY || "" },
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY || "" },
    google: { apiKey: process.env.GOOGLE_AI_API_KEY || "" },
    deepseek: { apiKey: process.env.DEEPSEEK_API_KEY || "" },
    meta: { apiKey: process.env.META_API_KEY || process.env.TOGETHER_API_KEY || "" },
    xai: { apiKey: process.env.XAI_API_KEY || "" },
    mistral: { apiKey: process.env.MISTRAL_API_KEY || "" },
    cohere: { apiKey: process.env.COHERE_API_KEY || "" },
    // OpenAI-compatible providers
    groq: { apiKey: process.env.GROQ_API_KEY || "" },
    cerebras: { apiKey: process.env.CEREBRAS_API_KEY || "" },
    sambanova: { apiKey: process.env.SAMBANOVA_API_KEY || "" },
    fireworks: { apiKey: process.env.FIREWORKS_API_KEY || "" },
    together: { apiKey: process.env.TOGETHER_API_KEY || "" },
    perplexity: { apiKey: process.env.PERPLEXITY_API_KEY || "" },
    moonshot: { apiKey: process.env.MOONSHOT_API_KEY || "" },
    zai: { apiKey: process.env.ZAI_API_KEY || "" },
    minimax: { apiKey: process.env.MINIMAX_API_KEY || "" },
    qwen: { apiKey: process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || "" },
  },
};
