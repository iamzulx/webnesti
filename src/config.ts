import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3000"),
  host: process.env.HOST || "0.0.0.0",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-in-production",
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
