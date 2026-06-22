import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join, resolve, sep } from "path";
import { config } from "./config.js";
import { getDb, saveDb } from "./db/index.js";
import { logger } from "./logger.js";
import { renderMetrics, setGauge } from "./metrics.js";
import { getCache, setCache, invalidateByTag } from "./cache.js";
import { initProviders } from "./providers/index.js";
import { cleanupBuckets } from "./middleware/rateLimit.js";
import { AppError } from "./errors.js";
import chatRoutes from "./routes/chat.js";
import modelsRoutes from "./routes/models.js";
import keysRoutes from "./routes/keys.js";
import authRoutes from "./routes/auth.js";
import billingRoutes from "./routes/billing.js";
import usageRoutes from "./routes/usage.js";
import midtransRoutes from "./routes/midtrans.js";
import adminRoutes from "./routes/admin.js";
import budgetRoutes from "./routes/budget.js";
import monetizationRoutes from "./routes/monetization.js";
import { generateOpenAPISpec } from "./routes/docs.js";
import viewsRoutes from "./routes/views.js";

const app = new Hono();

// Security headers
app.use("*", secureHeaders());

// CORS — restrict to configured origins
app.use("*", cors({ origin: config.corsOrigins }));

// Metrics + logging middleware
app.use("*", async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  await next();
  const duration = Date.now() - start;
  c.header("X-Response-Time", `${duration}ms`);
  c.header("X-Powered-By", "WebNesti");

  // Skip logging for static assets and health checks
  if (path === "/health" || path === "/metrics" || path.startsWith("/favicon")) return;
  const status = c.res.status;
  logger.debug(`${method} ${path} → ${status} ${duration}ms`);
  const { inc } = await import("./metrics.js");
  inc("http_requests_total", 1, { method, status: String(status) });
  inc("http_request_duration_ms_total", duration, { method });
});

// Error handler — never leak internals
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: { message: err.message, type: err.code || "error" } }, err.status);
  }
  console.error("[error]", err);
  return c.json({ error: { message: "Internal server error", type: "server_error" } }, 500);
});

// Health
app.get("/health", async (c) => {
  const { dbAll } = await import("./db/index.js");
  const models = dbAll("SELECT COUNT(*) as count FROM models WHERE is_active = 1");
  const users = dbAll("SELECT COUNT(*) as count FROM users");
  return c.json({
    status: "ok", server: "webnesti-api", version: "0.8.0",
    models: models[0]?.count || 0, users: users[0]?.count || 0,
    uptime: Math.round(process.uptime()),
  });
});

// OpenAPI spec
app.get("/v1/openapi.json", (c) => {
  return c.json(generateOpenAPISpec());
});

// API routes
app.route("/v1/chat", chatRoutes);
app.route("/v1/models", modelsRoutes);
app.route("/api/keys", keysRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/billing", billingRoutes);
app.route("/api/usage", usageRoutes);
app.route("/api/midtrans", midtransRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/budget", budgetRoutes);
app.route("/api", monetizationRoutes);
app.route("/views", viewsRoutes);

// Static file serving (frontend SPA)
const PUBLIC_DIR = join(process.cwd(), "public");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// Prometheus metrics
app.get("/metrics", (c) => {
  setGauge("webnesti_uptime_seconds", Math.round(process.uptime()));
  return c.text(renderMetrics(), 200, { "Content-Type": "text/plain; version=0.0.4" });
});

// Root redirect → dashboard
app.get("/", (c) => c.redirect("/views/dashboard", 302));

app.get("/favicon.ico", (c) => c.body(null, 204));

app.get("/*", async (c) => {
  const path = c.req.path;
  if (path.startsWith("/v1/") || path.startsWith("/api/")) {
    return c.json({ error: { message: "Not found", type: "not_found" } }, 404);
  }
  const filePath = resolve(PUBLIC_DIR, "." + (path === "/" ? "/index.html" : path));
  // Defense-in-depth against path traversal: never serve outside PUBLIC_DIR even
  // if a crafted/encoded path slips past URL normalization.
  const withinPublic = filePath === PUBLIC_DIR || filePath.startsWith(PUBLIC_DIR + sep);
  if (withinPublic && existsSync(filePath) && !filePath.endsWith(sep)) {
    try {
      const content = await readFile(filePath);
      const ext = filePath.slice(filePath.lastIndexOf("."));
      const mime = MIME[ext] || "application/octet-stream";
      c.header("Content-Type", mime);
      c.header("Cache-Control", ext === ".html" ? "no-cache" : "public, max-age=3600");
      return c.body(content);
    } catch {}
  }
  const indexPath = join(PUBLIC_DIR, "index.html");
  if (existsSync(indexPath)) {
    c.header("Content-Type", "text/html; charset=utf-8");
    c.header("Cache-Control", "no-cache");
    const content = await readFile(indexPath);
    return c.body(content);
  }
  return c.json({ error: { message: "Frontend not found", type: "not_found" } }, 404);
});

// Start
async function main() {
  await getDb();
  initProviders();

  // Periodically evict stale rate-limit buckets
  setInterval(() => cleanupBuckets(), 60_000).unref();

  const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
    logger.info("Server started", { host: config.host, port: info.port, version: "0.8.0" });
    logger.info("Frontend available");
    logger.info("API available");
    logger.info("OpenAPI spec available");
  });

  // Graceful shutdown
  function shutdown(signal: string) {
    console.log(`[webnesti] Received ${signal}, shutting down...`);
    saveDb();
    server.close(() => {
      console.log("[webnesti] Server closed");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
