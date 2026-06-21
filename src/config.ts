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

export const config = {
  isProduction,
  port: parseInt(process.env.PORT || "3000"),
  host: process.env.HOST || "0.0.0.0",
  jwtSecret,
  defaultMarkup: parseFloat(process.env.DEFAULT_MARKUP_PERCENT || "10"),
  midtransServerKey: process.env.MIDTRANS_SERVER_KEY || "",
  midtransIsProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  encryptionKey: process.env.ENCRYPTION_KEY || "dev-encryption-key-change-me-32b!!",
  corsOrigins: process.env.CORS_ORIGINS?.split(",").map(s => s.trim()) || ["https://webnesti.ai", "http://localhost:3000"],
  providers: {
    openai: { apiKey: process.env.OPENAI_API_KEY || "" },
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY || "" },
    google: { apiKey: process.env.GOOGLE_AI_API_KEY || "" },
    deepseek: { apiKey: process.env.DEEPSEEK_API_KEY || "" },
    meta: { apiKey: process.env.META_API_KEY || process.env.TOGETHER_API_KEY || "" },
    xai: { apiKey: process.env.XAI_API_KEY || "" },
    mistral: { apiKey: process.env.MISTRAL_API_KEY || "" },
  },
};
