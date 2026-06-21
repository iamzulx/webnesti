import { Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import { generateApiKey, hashApiKey } from "../encryption.js";
import { authMiddleware } from "../middleware/auth.js";
import { dbAll, dbGet, dbRun } from "../db/index.js";

const keys = new Hono();
keys.use("*", authMiddleware);

// Create API key
keys.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const name = body.name || "default";
  const rateLimit = body.rate_limit || 60;
  const dailyLimit = body.daily_limit || 10000;

  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 7);
  const id = uuidv4();

  dbRun(
    "INSERT INTO api_keys (id, user_id, key_hash, key_prefix, name, rate_limit, daily_limit) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, user.id, keyHash, keyPrefix, name, rateLimit, dailyLimit]
  );

  return c.json({
    id, name, key: rawKey, key_prefix: keyPrefix,
    rate_limit: rateLimit, daily_limit: dailyLimit,
    created_at: new Date().toISOString(),
    message: "Save this key — it will not be shown again.",
  }, 201);
});

// List keys
keys.get("/", async (c) => {
  const user = c.get("user");
  const rows = dbAll("SELECT * FROM api_keys WHERE user_id = ?", [user.id]);

  return c.json({
    object: "list",
    data: rows.map((k: any) => ({
      id: k.id, name: k.name, key_prefix: k.key_prefix,
      rate_limit: k.rate_limit, daily_limit: k.daily_limit,
      is_active: !!k.is_active, created_at: k.created_at,
    })),
  });
});

// Revoke key
keys.delete("/:id", async (c) => {
  const user = c.get("user");
  const keyId = c.req.param("id");
  dbRun("UPDATE api_keys SET is_active = 0 WHERE id = ? AND user_id = ?", [keyId, user.id]);
  return c.json({ id: keyId, deleted: true });
});

export default keys;
