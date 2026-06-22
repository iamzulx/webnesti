import { hashApiKey, generateApiKey, maskKey, encryptSecret, decryptSecret } from "../src/encryption.js";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) { console.log(`  ✅ ${name}`); passed++; }
    else { console.log(`  ❌ ${name}`); failed++; }
  } catch (e: any) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

console.log("\n=== Encryption Tests ===\n");

test("hashApiKey returns 64-char hex", () => {
  const h = hashApiKey("test");
  return h.length === 64 && /^[a-f0-9]+$/.test(h);
});

test("hashApiKey is deterministic", () => {
  return hashApiKey("test") === hashApiKey("test");
});

test("hashApiKey is unique for different keys", () => {
  return hashApiKey("key1") !== hashApiKey("key2");
});

test("generateApiKey returns wn_ prefixed hex", () => {
  const key = generateApiKey();
  return key.startsWith("wn_") && key.length === 67; // wn_ + 64 hex chars
});

test("generateApiKey returns unique keys", () => {
  return generateApiKey() !== generateApiKey();
});

test("maskKey masks middle characters", () => {
  const key = "wn_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
  const masked = maskKey(key);
  // maskKey returns first 7 chars + "..." + last 4 chars
  return masked.startsWith("wn_abcd") && masked.endsWith("7890") && masked.includes("...") && masked.length < key.length;
});

test("encryptSecret + decryptSecret round-trips", () => {
  const secret = "sk-test-secret-key-12345";
  const encrypted = encryptSecret(secret);
  const decrypted = decryptSecret(encrypted);
  return decrypted === secret;
});

test("encryptSecret produces different output each time", () => {
  const e1 = encryptSecret("same-secret");
  const e2 = encryptSecret("same-secret");
  return e1 !== e2; // IV is random
});

test("decryptSecret rejects malformed input", () => {
  try { decryptSecret("malformed"); return false; } catch { return true; }
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
