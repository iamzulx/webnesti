import { config } from "./config.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  [key: string]: unknown;
}

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL: LogLevel = config.isProduction ? "info" : "debug";

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (LEVELS[level] < LEVELS[MIN_LEVEL]) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    service: "webnesti",
    message,
    ...meta,
  };

  if (config.isProduction) {
    // JSON format for prod (structured logging)
    process.stderr.write(JSON.stringify(entry) + "\n");
  } else {
    // Human-readable for dev
    const color = { debug: "\x1b[36m", info: "\x1b[32m", warn: "\x1b[33m", error: "\x1b[31m" };
    const reset = "\x1b[0m";
    const metaStr = meta ? " " + JSON.stringify(meta) : "";
    process.stderr.write(`${color[level]}[${entry.timestamp}] [${level.toUpperCase()}] ${message}${metaStr}${reset}\n`);
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
};
