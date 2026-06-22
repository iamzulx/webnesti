import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// --- Users ---
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  balance: real("balance").default(0).notNull(),
  tier: text("tier").default("free").notNull(),
  isAdmin: integer("is_admin").default(0).notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// --- API Keys ---
export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  name: text("name").default("default"),
  rateLimit: integer("rate_limit").default(60).notNull(),
  dailyLimit: integer("daily_limit").default(10000).notNull(),
  monthlyBudget: real("monthly_budget"),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: text("expires_at"),
});

// --- Providers ---
export const providers = sqliteTable("providers", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  baseUrl: text("base_url").notNull(),
  authType: text("auth_type").default("bearer").notNull(),
  isActive: integer("is_active").default(1).notNull(),
  priority: integer("priority").default(100).notNull(),
});

// --- Models ---
export const models = sqliteTable("models", {
  id: text("id").primaryKey(),
  providerId: text("provider_id").notNull().references(() => providers.id),
  displayName: text("display_name").notNull(),
  contextLength: integer("context_length"),
  pricingInput: real("pricing_input").notNull(),
  pricingOutput: real("pricing_output").notNull(),
  supportsStreaming: integer("supports_streaming").default(1),
  supportsVision: integer("supports_vision").default(0),
  supportsTools: integer("supports_tools").default(0),
  isActive: integer("is_active").default(1).notNull(),
  metadata: text("metadata"),
});

// --- Usage Logs ---
export const usageLogs = sqliteTable("usage_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  apiKeyId: text("api_key_id").notNull(),
  modelId: text("model_id").notNull(),
  providerId: text("provider_id").notNull(),
  promptTokens: integer("prompt_tokens").default(0),
  completionTokens: integer("completion_tokens").default(0),
  totalTokens: integer("total_tokens").default(0),
  costUsd: real("cost_usd").default(0),
  latencyMs: integer("latency_ms").default(0),
  statusCode: integer("status_code"),
  isStream: integer("is_stream").default(0),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// --- Billing Transactions ---
export const billingTransactions = sqliteTable("billing_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// --- Referrals ---
export const referrals = sqliteTable("referrals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  code: text("code").notNull().unique(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// --- Referral Uses ---
export const referralUses = sqliteTable("referral_uses", {
  id: text("id").primaryKey(),
  referrerId: text("referrer_id").notNull(),
  referredId: text("referred_id").notNull().unique(),
  code: text("code").notNull(),
  creditAmount: real("credit_amount").default(5),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// --- BYOK Keys ---
export const byokKeys = sqliteTable("byok_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  keyHash: text("key_hash").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Re-export for use in route files
export {
  users as usersTable,
  apiKeys as apiKeysTable,
  providers as providersTable,
  models as modelsTable,
  usageLogs as usageLogsTable,
  billingTransactions as billingTransactionsTable,
  referrals as referralsTable,
  referralUses as referralUsesTable,
  byokKeys as byokKeysTable,
};
