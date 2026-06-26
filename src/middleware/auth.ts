import { Context, Next } from "hono";
import { parse } from "cookie";
import jwt from "jsonwebtoken";
import { dbGet } from "../db/index.js";
import { hashApiKey } from "../encryption.js";
import { config } from "../config.js";
import { UnauthorizedError } from "../errors.js";

// Resolve auth from EITHER an API key (Bearer wn_...) or a logged-in browser
// session (JWT cookie). API keys are the primary path for programmatic clients;
// the session fallback exists so the in-browser Playground works without making
// the user paste a key they only saw once at registration. Session requests are
// billed against the user's "default" API key for usage attribution.
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  // 1. API key path (Bearer wn_... or raw wn_...).
  if (authHeader) {
    const key = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    if (!key.startsWith("wn_")) throw new UnauthorizedError("Invalid API key format");

    const apiKey = dbGet("SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1", [hashApiKey(key)]);
    if (!apiKey) throw new UnauthorizedError("Invalid or revoked API key");
    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) throw new UnauthorizedError("API key expired");

    const user = dbGet("SELECT * FROM users WHERE id = ?", [apiKey.user_id]);
    if (!user) throw new UnauthorizedError("User not found");

    c.set("user", user);
    c.set("apiKey", apiKey);
    return next();
  }

  // 2. Browser session fallback (JWT cookie set at login). Content-Type on chat
  //    is application/json, which forces a CORS preflight, so cross-origin CSRF
  //    is blocked by the configured corsOrigins allowlist.
  const token = parse(c.req.header("cookie") || "")["session"];
  if (!token) throw new UnauthorizedError("Missing Authorization header");

  let payload: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"], audience: "webnesti-api", issuer: "webnesti" });
    if (typeof decoded === "string") throw new Error("bad payload");
    payload = decoded;
  } catch {
    throw new UnauthorizedError("Invalid or expired session");
  }

  const user = dbGet("SELECT * FROM users WHERE id = ?", [payload.sub]);
  if (!user) throw new UnauthorizedError("User not found");

  // Attribute usage to the user's default key (any active key works for billing).
  const apiKey = dbGet(
    "SELECT * FROM api_keys WHERE user_id = ? AND is_active = 1 ORDER BY (name = 'default') DESC LIMIT 1",
    [user.id]
  );
  if (!apiKey) throw new UnauthorizedError("No active API key for this account");

  c.set("user", user);
  c.set("apiKey", apiKey);
  await next();
}
