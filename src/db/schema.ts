import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// --- Users ---
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  balance: real("balance").default(0).notNull(),
  tier: text("tier").default("free").notNull(), // free | starter | pro | enterprise
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// --- API Keys ---
export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(), // "wn_" + first 4 chars
  name: text("name").default("default"),
  rateLimit: integer("rate_limit").default(60).notNull(),      // req/min
  dailyLimit: integer("daily_limit").default(10000).notNull(),
  monthlyBudget: real("monthly_budget"),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: text("expires_at"),
});

// --- Provider Config ---
export const providers = sqliteTable("providers", {
  id: text("id").primaryKey(),          // "openai", "anthropic", "google"
  displayName: text("display_name").notNull(),
  baseUrl: text("base_url").notNull(),
  authType: text("auth_type").default("bearer").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  priority: integer("priority").default(100).notNull(),
});

// --- Model Registry ---
export const models = sqliteTable("models", {
  id: text("id").primaryKey(),           // "openai/gpt-4o"
  providerId: text("provider_id").notNull().references(() => providers.id),
  displayName: text("display_name").notNull(),
  contextLength: integer("context_length"),
  pricingInput: real("pricing_input").notNull(),   // per token (USD)
  pricingOutput: real("pricing_output").notNull(),
  supportsStreaming: integer("supports_streaming", { mode: "boolean" }).default(true),
  supportsVision: integer("supports_vision", { mode: "boolean" }).default(false),
  supportsTools: integer("supports_tools", { mode: "boolean" }).default(false),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  metadata: text("metadata"),            // JSON string
});

// --- Usage Logs ---
export const usageLogs = sqliteTable("usage_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  apiKeyId: text("api_key_id").notNull().references(() => apiKeys.id),
  modelId: text("model_id").notNull(),
  providerId: text("provider_id").notNull(),
  promptTokens: integer("prompt_tokens").default(0),
  completionTokens: integer("completion_tokens").default(0),
  totalTokens: integer("total_tokens").default(0),
  costUsd: real("cost_usd").default(0),
  latencyMs: integer("latency_ms").default(0),
  statusCode: integer("status_code"),
  isStream: integer("is_stream", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// --- Billing Transactions ---
export const billingTransactions = sqliteTable("billing_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),          // topup | usage | refund | credit
  amount: real("amount").notNull(),
  description: text("description"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});
