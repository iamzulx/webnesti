import {
  ChatRequestSchema, RegisterSchema, LoginSchema,
  CreateKeySchema, BudgetSchema, UpgradeSchema, capToTier
} from "../src/validators.js";

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

console.log("\n=== Validation Tests ===\n");

// ChatRequest
test("valid chat request passes", () => {
  const result = ChatRequestSchema.safeParse({
    model: "openai/gpt-4o",
    messages: [{ role: "user", content: "Hello" }],
  });
  return result.success === true;
});

test("chat request rejects empty model", () => {
  const result = ChatRequestSchema.safeParse({
    model: "",
    messages: [{ role: "user", content: "Hello" }],
  });
  return result.success === false;
});

test("chat request rejects empty messages", () => {
  const result = ChatRequestSchema.safeParse({
    model: "gpt-4o",
    messages: [],
  });
  return result.success === false;
});

test("chat request rejects temperature out of range", () => {
  const result = ChatRequestSchema.safeParse({
    model: "gpt-4o",
    messages: [{ role: "user", content: "Hi" }],
    temperature: 3,
  });
  return result.success === false;
});

// Register
test("valid registration passes", () => {
  const result = RegisterSchema.safeParse({
    email: "user@example.com",
    password: "securepass123",
  });
  return result.success === true;
});

test("registration rejects short password", () => {
  const result = RegisterSchema.safeParse({
    email: "user@example.com",
    password: "short",
  });
  return result.success === false;
});

test("registration rejects invalid email", () => {
  const result = RegisterSchema.safeParse({
    email: "not-an-email",
    password: "securepass123",
  });
  return result.success === false;
});

// Login
test("valid login passes", () => {
  const result = LoginSchema.safeParse({
    email: "user@example.com",
    password: "anypassword",
  });
  return result.success === true;
});

// Budget
test("budget accepts null", () => {
  const result = BudgetSchema.safeParse({ monthly_budget: null });
  return result.success === true;
});

test("budget rejects negative value", () => {
  const result = BudgetSchema.safeParse({ monthly_budget: -10 });
  return result.success === false;
});

// Upgrade
test("upgrade accepts valid tier", () => {
  const result = UpgradeSchema.safeParse({ tier: "starter" });
  return result.success === true;
});

test("upgrade rejects invalid tier", () => {
  const result = UpgradeSchema.safeParse({ tier: "gold" });
  return result.success === false;
});

test("upgrade rejects enterprise (not self-serve)", () => {
  const result = UpgradeSchema.safeParse({ tier: "enterprise" });
  return result.success === false;
});

// capToTier — quota self-escalation guard
test("capToTier caps free-tier key below requested limits", () => {
  const r = capToTier("free", { rateLimit: 999999, dailyLimit: 999999999 });
  return r.rateLimit === 20 && r.dailyLimit === 1000;
});

test("capToTier honors lower-than-ceiling requests", () => {
  const r = capToTier("pro", { rateLimit: 10, dailyLimit: 500 });
  return r.rateLimit === 10 && r.dailyLimit === 500;
});

test("capToTier falls back to free ceiling for unknown tier", () => {
  const r = capToTier("bogus", { rateLimit: 999999, dailyLimit: 999999 });
  return r.rateLimit === 20 && r.dailyLimit === 1000;
});

test("capToTier uses tier defaults when no limits requested", () => {
  const r = capToTier("starter", {});
  return r.rateLimit === 60 && r.dailyLimit === 10000;
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
