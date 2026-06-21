import initSqlJs, { Database } from "sql.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") || "./data/webnesti.db";

let db: Database;

export async function getDb(): Promise<Database> {
  if (db) return db;

  mkdirSync(dirname(DB_PATH), { recursive: true });

  const SQL = await initSqlJs();

  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create all tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      password_hash TEXT NOT NULL,
      balance REAL DEFAULT 0 NOT NULL,
      tier TEXT DEFAULT 'free' NOT NULL,
      is_admin INTEGER DEFAULT 0 NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

  // Migration: add is_admin to pre-existing databases. Admin access is a dedicated
  // flag, never inferred from the (purchasable) tier. ALTER fails if the column
  // already exists, so swallow that case.
  try {
    db.run(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0 NOT NULL`);
  } catch {}

  db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key_hash TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      name TEXT DEFAULT 'default',
      rate_limit INTEGER DEFAULT 60 NOT NULL,
      daily_limit INTEGER DEFAULT 10000 NOT NULL,
      monthly_budget REAL,
      is_active INTEGER DEFAULT 1 NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      expires_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      auth_type TEXT DEFAULT 'bearer' NOT NULL,
      is_active INTEGER DEFAULT 1 NOT NULL,
      priority INTEGER DEFAULT 100 NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES providers(id),
      display_name TEXT NOT NULL,
      context_length INTEGER,
      pricing_input REAL NOT NULL,
      pricing_output REAL NOT NULL,
      supports_streaming INTEGER DEFAULT 1,
      supports_vision INTEGER DEFAULT 0,
      supports_tools INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1 NOT NULL,
      metadata TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      api_key_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      latency_ms INTEGER DEFAULT 0,
      status_code INTEGER,
      is_stream INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS billing_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

  // NEW: Referrals table
  db.run(`
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

  // NEW: Referral uses table
  db.run(`
    CREATE TABLE IF NOT EXISTS referral_uses (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,
      referred_id TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL,
      credit_amount REAL DEFAULT 5,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

  // NEW: BYOK keys table
  db.run(`
    CREATE TABLE IF NOT EXISTS byok_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

  // Performance indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_usage_logs_model_id ON usage_logs(model_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_billing_transactions_user_id ON billing_transactions(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON referrals(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_referral_uses_referrer_id ON referral_uses(referrer_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_byok_keys_user_id ON byok_keys(user_id)`);

  saveDb();
  return db;
}

export function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

// Query helpers
export function dbAll(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export function dbGet(sql: string, params: any[] = []): any | undefined {
  return dbAll(sql, params)[0];
}

export function dbRun(sql: string, params: any[] = []) {
  db.run(sql, params);
  saveDb();
}
