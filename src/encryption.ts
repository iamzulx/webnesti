import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { config } from "./config.js";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): string {
  return "wn_" + randomBytes(32).toString("hex");
}

export function maskKey(key: string): string {
  return key.slice(0, 7) + "..." + key.slice(-4);
}

// --- Reversible secret encryption (AES-256-GCM) ---
// Used for third-party (BYOK) provider keys that must be decrypted later to call
// upstream APIs, so a one-way hash is not an option. The 32-byte AES key is derived
// from config.encryptionKey via SHA-256.
const AES_KEY = createHash("sha256").update(config.encryptionKey).digest();

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", AES_KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store as iv:tag:ciphertext (all hex) so it is self-describing.
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Malformed encrypted secret");
  const decipher = createDecipheriv("aes-256-gcm", AES_KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}
