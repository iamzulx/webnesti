/**
 * Shared DB query helpers for spend/usage lookups.
 *
 * These patterns were duplicated across routes/chat.ts (per-key caps) and
 * routes/budget.ts (per-user dashboards). Centralizing them ensures consistent
 * date boundaries and column semantics.
 */
import { dbGet } from "./index.js";

/** Total cost this calendar month for a specific API key. */
export function monthlySpendByKey(apiKeyId: string): number {
  const row = dbGet(
    "SELECT COALESCE(SUM(cost_usd), 0) AS total FROM usage_logs WHERE api_key_id = ? AND created_at >= datetime('now', 'start of month')",
    [apiKeyId],
  );
  return row?.total || 0;
}

/** Total cost this calendar month for a user (across all keys). */
export function monthlySpendByUser(userId: string): number {
  const row = dbGet(
    "SELECT COALESCE(SUM(cost_usd), 0) AS total FROM usage_logs WHERE user_id = ? AND created_at >= datetime('now', 'start of month')",
    [userId],
  );
  return row?.total || 0;
}

/** Total cost in the last 24 hours for a user. */
export function dailySpendByUser(userId: string): number {
  const row = dbGet(
    "SELECT COALESCE(SUM(cost_usd), 0) AS total FROM usage_logs WHERE user_id = ? AND created_at >= datetime('now', '-1 day')",
    [userId],
  );
  return row?.total || 0;
}

/** Number of requests in the last 24 hours for a specific API key. */
export function dailyRequestsByKey(apiKeyId: string): number {
  const row = dbGet(
    "SELECT COUNT(*) AS total FROM usage_logs WHERE api_key_id = ? AND created_at >= datetime('now', '-1 day')",
    [apiKeyId],
  );
  return row?.total || 0;
}

/** Number of requests in the last 24 hours for a user (across all keys). */
export function dailyRequestsByUser(userId: string): number {
  const row = dbGet(
    "SELECT COUNT(*) AS count FROM usage_logs WHERE user_id = ? AND created_at >= datetime('now', '-1 day')",
    [userId],
  );
  return row?.count || 0;
}
