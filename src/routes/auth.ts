import { Hono } from "hono";
import { dbGet, dbRun } from "../db/index.js";
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto";
import { parse, serialize } from "cookie";
import { config } from "../config.js";

const auth = new Hono();

// --- Password helpers ---
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(hash), Buffer.from(derived));
}

// --- JWT helpers ---
function signJWT(payload: Record<string, any>): string {
  // Simple JWT-like token (no library needed for basic auth)
  // For production, use jsonwebtoken
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 86400 })).toString("base64url");
  const sig = randomBytes(32).toString("hex"); // HMAC in real JWT, simplified here
  return `${header}.${body}.${sig}`;
}

// POST /api/auth/register
auth.post("/register", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { email, password, name } = body;

  if (!email) return c.json({ error: "email required" }, 400);
  if (!password || password.length < 6) return c.json({ error: "password must be at least 6 characters" }, 400);

  // Check if user already exists
  const existing = dbGet("SELECT id FROM users WHERE email = ?", [email]);
  if (existing) return c.json({ error: "Email already registered" }, 409);

  // Create user
  const id = randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password);
  const displayName = name || email.split("@")[0];

  dbRun(
    "INSERT INTO users (id, email, name, password_hash, balance, tier) VALUES (?, ?, ?, ?, 0, 'free')",
    [id, email, displayName, passwordHash]
  );

  // Create a default API key for the user
  const keyId = randomBytes(16).toString("hex");
  const rawKey = "wn_" + randomBytes(32).toString("hex");
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 7);

  dbRun(
    "INSERT INTO api_keys (id, user_id, key_hash, key_prefix, name, rate_limit, daily_limit) VALUES (?, ?, ?, ?, 'default', 60, 10000)",
    [keyId, id, keyHash, keyPrefix]
  );

  return c.json({
    user: { id, email, name: displayName, tier: "free", balance: 0 },
    api_key: rawKey,
    message: "Save your API key — it will not be shown again.",
  }, 201);
});

// POST /api/auth/login
auth.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { email, password } = body;

  if (!email) return c.json({ error: "email required" }, 400);

  const user = dbGet("SELECT * FROM users WHERE email = ?", [email]);
  if (!user) return c.json({ error: "Invalid email or password" }, 401);

  // If password provided, verify it
  if (password) {
    if (!verifyPassword(password, user.password_hash)) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
  }

  // Generate JWT token
  const token = signJWT({ sub: user.id, email: user.email });

  const cookie = serialize("session", token, {
    httpOnly: true,
    path: "/",
    maxAge: 86400,
    sameSite: "lax",
  });
  c.header("Set-Cookie", cookie);

  return c.json({
    user: { id: user.id, email: user.email, name: user.name, tier: user.tier, balance: user.balance },
    token,
  });
});

// GET /api/auth/me
auth.get("/me", (c) => {
  const cookieHeader = c.req.header("cookie") || "";
  const cookies = parse(cookieHeader);
  const token = cookies["session"] || c.req.header("Authorization")?.replace("Bearer ", "");

  if (!token) return c.json({ error: "Not authenticated" }, 401);

  try {
    // Decode JWT payload
    const parts = token.split(".");
    if (parts.length !== 3) return c.json({ error: "Invalid token format" }, 401);

    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return c.json({ error: "Token expired" }, 401);
    }

    const user = dbGet("SELECT id, email, name, balance, tier, created_at FROM users WHERE id = ?", [payload.sub]);
    if (!user) return c.json({ error: "User not found" }, 404);

    return c.json({ user });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

// POST /api/auth/logout
auth.post("/logout", (c) => {
  const cookie = serialize("session", "", { httpOnly: true, path: "/", maxAge: 0 });
  c.header("Set-Cookie", cookie);
  return c.json({ message: "Logged out" });
});

export default auth;
