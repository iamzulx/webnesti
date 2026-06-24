import { getFallbackChain, executeWithFallback } from "../src/routing/fallback.js";
import type { Provider } from "../src/providers/types.js";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean | Promise<boolean>) {
  const result = fn();
  if (result instanceof Promise) {
    return result.then(ok => {
      if (ok) { console.log(`  ✅ ${name}`); passed++; }
      else { console.log(`  ❌ ${name}`); failed++; }
    }).catch((e: any) => {
      console.log(`  ❌ ${name}: ${e.message}`);
      failed++;
    });
  }
  try {
    if (result) { console.log(`  ✅ ${name}`); passed++; }
    else { console.log(`  ❌ ${name}`); failed++; }
  } catch (e: any) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

function makeProvider(id: string): Provider {
  return {
    id,
    name: id,
    chat: async () => { throw new Error("stub"); },
    chatStream: async function* () {},
    listModels: () => [],
    isAvailable: () => true,
  };
}

console.log("\n=== Fallback Tests ===\n");

// getFallbackChain
test("getFallbackChain returns known chain for openai", () => {
  const chain = getFallbackChain("openai");
  return Array.isArray(chain) && chain.includes("openai");
});

test("getFallbackChain returns known chain for anthropic", () => {
  const chain = getFallbackChain("anthropic");
  return Array.isArray(chain) && chain.includes("anthropic");
});

test("getFallbackChain returns [providerId] for unknown", () => {
  const chain = getFallbackChain("custom-provider");
  return chain.length === 1 && chain[0] === "custom-provider";
});

// executeWithFallback — success on first attempt
async function runTests() {
  await test("executeWithFallback succeeds on first try", async () => {
    const providers = new Map<string, Provider>();
    providers.set("openai", makeProvider("openai"));
    const result = await executeWithFallback(
      providers,
      "openai",
      async () => ({ answer: 42 }),
    );
    return result.success === true && result.attempts === 1 && result.response.answer === 42;
  });

  await test("executeWithFallback reports failure when provider throws", async () => {
    const providers = new Map<string, Provider>();
    providers.set("openai", makeProvider("openai"));
    const result = await executeWithFallback(
      providers,
      "openai",
      async () => { throw new Error("API down"); },
    );
    return result.success === false && result.error === "API down";
  });

  await test("executeWithFallback reports failure for missing provider", async () => {
    const providers = new Map<string, Provider>();
    const result = await executeWithFallback(
      providers,
      "missing",
      async () => ({ ok: true }),
    );
    return result.success === false && result.error!.includes("not available");
  });

  await test("executeWithFallback stops on auth error (401)", async () => {
    const providers = new Map<string, Provider>();
    providers.set("openai", makeProvider("openai"));
    let callCount = 0;
    const result = await executeWithFallback(
      providers,
      "openai",
      async () => {
        callCount++;
        const err: any = new Error("Unauthorized");
        err.status = 401;
        throw err;
      },
      3,
    );
    return result.success === false && callCount === 1;
  });

  await test("executeWithFallback stops on auth error (403)", async () => {
    const providers = new Map<string, Provider>();
    providers.set("openai", makeProvider("openai"));
    const result = await executeWithFallback(
      providers,
      "openai",
      async () => {
        const err: any = new Error("Forbidden");
        err.status = 403;
        throw err;
      },
      3,
    );
    return result.success === false;
  });

  await test("executeWithFallback records latencyMs", async () => {
    const providers = new Map<string, Provider>();
    providers.set("openai", makeProvider("openai"));
    const result = await executeWithFallback(
      providers,
      "openai",
      async () => "ok",
    );
    return result.latencyMs >= 0;
  });

  await test("executeWithFallback respects maxAttempts", async () => {
    const providers = new Map<string, Provider>();
    providers.set("openai", makeProvider("openai"));
    let callCount = 0;
    await executeWithFallback(
      providers,
      "openai",
      async () => { callCount++; throw new Error("fail"); },
      1,
    );
    return callCount === 1;
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
