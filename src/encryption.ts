import { createHash, randomBytes } from "crypto";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): string {
  return "wn_" + randomBytes(32).toString("hex");
}

export function maskKey(key: string): string {
  return key.slice(0, 7) + "..." + key.slice(-4);
}
