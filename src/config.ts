import "dotenv/config";

const isProduction = process.env.NODE_ENV === "production";

const INSECURE_JWT_SECRETS = new Set([
  "",
  "dev-secret-change-in-production",
  "change-this-to-a-random-secret-in-production",
]);

const jwtSecret = process.env.JWT_SECRET || "dev-secret-change-in-production";

// Never allow a missing/placeholder JWT secret to be used in production: an
// attacker who knows the default value can forge session tokens for any user.
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
