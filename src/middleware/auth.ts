import { Context, Next } from "hono";
import { dbGet } from "../db/index.js";
import { hashApiKey } from "../encryption.js";
import { UnauthorizedError } from "../errors.js";

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) throw new UnauthorizedError("Missing Authorization header");

  const key = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (!key.startsWith("wn_")) throw new UnauthorizedError("Invalid API key format");

  const keyHash = hashApiKey(key);
  const apiKey = dbGet("SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1", [keyHash]);

  if (!apiKey) throw new UnauthorizedError("Invalid or revoked API key");
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) throw new UnauthorizedError("API key expired");

  const user = dbGet("SELECT * FROM users WHERE id = ?", [apiKey.user_id]);
  if (!user) throw new UnauthorizedError("User not found");

  c.set("user", user);
  c.set("apiKey", apiKey);
  await next();
}
