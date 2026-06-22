import { Hono } from "hono";
import { dbGet, dbRun } from "../db/index.js";
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto";
import { parse, serialize } from "cookie";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { RegisterSchema, LoginSchema } from "../validators.js";

const auth = new Hono();

const SESSION_TTL_SECONDS = 86400; // 24h

// --- Password helpers ---
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// Precomputed hash of a random value, used to keep login timing constant when
// the email is unknown (mitigates user enumeration via response time).
const DUMMY_PASSWORD_HASH = hashPassword(randomBytes(32).toString("hex"));

function verifyPassword(password: string, stored: string): boolean {
  if (typeof stored !== "string") return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const derived = scryptSync(password, salt, 64).toString("hex");
  const hashBuf = Buffer.from(hash, "hex");
  const derivedBuf = Buffer.from(derived, "hex");
  // timingSafeEqual throws if the buffers differ in length, so guard first.
  if (hashBuf.length !== derivedBuf.length) return false;
  return timingSafeEqual(hashBuf, derivedBuf);
}

// --- JWT helpers ---
// Tokens are signed and verified with an HMAC over config.jwtSecret so they
// cannot be forged or tampered with by clients.
function signJWT(payload: Record<string, any>): string {
  return jwt.sign(payload, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: SESSION_TTL_SECONDS,
  });
}

function verifyJWT(token: string): jwt.JwtPayload {
  // Pin the algorithm to block "alg: none" / algorithm-confusion attacks.
  const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
  if (typeof decoded === "string") throw new Error("Invalid token payload");
  return decoded;
}

// --- Brute-force protection for auth endpoints ---
// Simple per-IP fixed-window limiter. The main rate limiter only runs for
// API-key contexts, leaving /login and /register open to credential stuffing.
const AUTH_WINDOW_MS = 60_000;
const AUTH_MAX_ATTEMPTS = 10;
const authAttempts = new Map<string, { count: number; resetAt: number }>();

function clientIp(c: { req: { header: (n: string) => string | undefined } }): string {
  const fwd = c.req.header("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return c.req.header("x-real-ip") || "unknown";
}

function authRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = authAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    authAttempts.set(ip, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > AUTH_MAX_ATTEMPTS;
}

// Evict stale entries so the map cannot grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of Array.from(authAttempts.entries())) {
    if (now > entry.resetAt) authAttempts.delete(ip);
  }
}, AUTH_WINDOW_MS).unref();

// POST /api/auth/register
auth.post("/register", async (c) => {
  if (authRateLimited(clientIp(c))) {
    return c.json({ error: "Too many attempts, try again later" }, 429);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || "Invalid email or password" }, 400);
  }
  const { email, password, name } = parsed.data;

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
  if (authRateLimited(clientIp(c))) {
    return c.json({ error: "Too many attempts, try again later" }, 429);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid email or password" }, 400);
  }
  const { email, password } = parsed.data;

  const user = dbGet("SELECT * FROM users WHERE email = ?", [email]);

  // Always verify a password (against a dummy hash when the user is unknown)
  // so the response time does not reveal whether the email exists, and never
  // allow login without a valid password.
  const stored = user?.password_hash ?? DUMMY_PASSWORD_HASH;
  const ok = verifyPassword(password, stored);
  if (!user || !ok) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  // Generate JWT token
  const token = signJWT({ sub: user.id, email: user.email });

  const cookie = serialize("session", token, {
    httpOnly: true,
    secure: config.isProduction,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
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

  let payload: jwt.JwtPayload;
  try {
    // Verifies the HMAC signature and expiry; throws on tampering/expiry.
    payload = verifyJWT(token);
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }

  const user = dbGet("SELECT id, email, name, balance, tier, created_at FROM users WHERE id = ?", [payload.sub]);
  if (!user) return c.json({ error: "User not found" }, 404);

  return c.json({ user });
});

// POST /api/auth/logout
auth.post("/logout", (c) => {
  const cookie = serialize("session", "", { httpOnly: true, secure: config.isProduction, path: "/", maxAge: 0 });
  c.header("Set-Cookie", cookie);
  return c.json({ message: "Logged out" });
});

export default auth;
