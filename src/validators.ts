import { z } from "zod";

export const ChatRequestSchema = z.object({
  model: z.string().min(1).max(256),
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant", "tool", "function", "developer"]),
    content: z.union([z.string(), z.array(z.unknown())]),
  })).min(1).max(256),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(200_000).optional(),
  top_p: z.number().min(0).max(1).optional(),
  stream: z.boolean().optional(),
});

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().max(255).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const CreateKeySchema = z.object({
  name: z.string().max(255).optional(),
  rate_limit: z.number().int().min(1).max(10000).optional(),
  daily_limit: z.number().int().min(1).max(1_000_000).optional(),
});

/**
 * Per-tier hard caps for API key rate/daily limits. A user cannot create a key
 * with limits above their tier's ceiling (prevents quota self-escalation).
 * enterprise: 0 = unlimited.
 */
export const TIER_LIMITS: Record<string, { rateLimit: number; dailyLimit: number }> = {
  free: { rateLimit: 20, dailyLimit: 1000 },
  starter: { rateLimit: 60, dailyLimit: 10000 },
  pro: { rateLimit: 300, dailyLimit: 100000 },
  enterprise: { rateLimit: 100000, dailyLimit: 100000000 },
};

export function capToTier(tier: string, requested: { rateLimit?: number; dailyLimit?: number }): { rateLimit: number; dailyLimit: number } {
  const caps = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const rateLimit = Math.min(requested.rateLimit ?? caps.rateLimit, caps.rateLimit);
  const dailyLimit = Math.min(requested.dailyLimit ?? caps.dailyLimit, caps.dailyLimit);
  return { rateLimit, dailyLimit };
}

export const TopUpSchema = z.object({
  amount: z.number().min(1000),
});

export const BudgetSchema = z.object({
  monthly_budget: z.number().min(0).nullable().optional(),
});

export const UpgradeSchema = z.object({
  tier: z.enum(["free", "starter", "pro"]),
});

export const ReferralApplySchema = z.object({
  code: z.string().min(1),
});

export const ByokSchema = z.object({
  provider: z.string().min(1),
  api_key: z.string().min(1),
});

export type ChatRequestInput = z.infer<typeof ChatRequestSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateKeyInput = z.infer<typeof CreateKeySchema>;
