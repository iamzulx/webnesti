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
  key: z.string().min(1),
});

export type ChatRequestInput = z.infer<typeof ChatRequestSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateKeyInput = z.infer<typeof CreateKeySchema>;
