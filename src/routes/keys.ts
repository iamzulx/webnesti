import { Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import { generateApiKey, hashApiKey } from "../encryption.js";
import { authMiddleware } from "../middleware/auth.js";
import { dbAll, dbGet, dbRun } from "../db/index.js";
import { CreateKeySchema, capToTier } from "../validators.js";

const keys = new Hono();
keys.use("*", authMiddleware);

// Create API key
keys.post("/", async (c) => {
  const user = c.get("user");
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON in request body" }, 400);
  }

  // Validate input shape with Zod.
  const parsed = CreateKeySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, 400);
  }

  const name = parsed.data.name || "default";

  // Cap requested limits to the user's tier ceiling. Without this, a free-tier
  // user could create a key with rate_limit: 999999 and bypass their tier quota.
  const { rateLimit, dailyLimit } = capToTier(user.tier, {
    rateLimit: parsed.data.rate_limit,
    dailyLimit: parsed.data.daily_limit,
  });

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
