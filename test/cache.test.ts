import { getCache, setCache, invalidateByTag, cacheStats, clearCache } from "../src/cache.js";

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

console.log("\n=== Cache Tests ===\n");

// Clean slate
clearCache();

test("getCache returns undefined for missing key", () => {
  return getCache("nonexistent") === undefined;
});

test("setCache + getCache round-trips", () => {
  setCache("key1", { data: "hello" }, 10_000);
  const v = getCache<{ data: string }>("key1");
  return v !== undefined && v.data === "hello";
});

test("getCache returns undefined for expired entry", () => {
  setCache("expired", "value", -1); // already expired
  return getCache("expired") === undefined;
});

test("cacheStats reflects stored entries", () => {
  clearCache();
  setCache("a", 1, 10_000);
  setCache("b", 2, 10_000);
  const stats = cacheStats();
  return stats.size === 2 && stats.keys.includes("a") && stats.keys.includes("b");
});

test("clearCache removes all entries", () => {
  setCache("x", 1, 10_000);
  clearCache();
  return cacheStats().size === 0 && getCache("x") === undefined;
});

test("invalidateByTag removes tagged entries", () => {
  clearCache();
  setCache("tagged1", "v1", 10_000, ["models"]);
  setCache("tagged2", "v2", 10_000, ["models", "providers"]);
  setCache("untagged", "v3", 10_000, []);
  const removed = invalidateByTag("models");
  return removed === 2 && getCache("tagged1") === undefined && getCache("tagged2") === undefined && getCache("untagged") === "v3";
});

test("invalidateByTag returns 0 for nonexistent tag", () => {
  clearCache();
  setCache("a", 1, 10_000, ["x"]);
  return invalidateByTag("y") === 0;
});

test("setCache overwrites existing key", () => {
  clearCache();
  setCache("k", "first", 10_000);
  setCache("k", "second", 10_000);
  return getCache("k") === "second" && cacheStats().size === 1;
});

test("setCache supports various value types", () => {
  clearCache();
  setCache("num", 42, 10_000);
  setCache("arr", [1, 2, 3], 10_000);
  setCache("bool", true, 10_000);
  setCache("null", null, 10_000);
  return getCache("num") === 42 &&
    Array.isArray(getCache("arr")) &&
    getCache("bool") === true &&
    getCache("null") === null;
});

test("invalidateByTag only removes matching tag entries", () => {
  clearCache();
  setCache("a", 1, 10_000, ["tag1"]);
  setCache("b", 2, 10_000, ["tag2"]);
  setCache("c", 3, 10_000, ["tag1", "tag2"]);
  invalidateByTag("tag1");
  return getCache("a") === undefined && getCache("b") === 2 && getCache("c") === undefined;
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
