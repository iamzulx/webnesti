import { AppError, UnauthorizedError, NotFoundError, RateLimitError, InsufficientBalanceError } from "../src/errors.js";

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

console.log("\n=== Error Classes Tests ===\n");

// AppError
test("AppError has correct defaults", () => {
  const e = new AppError("something broke");
  return e.message === "something broke" && e.status === 500 && e.code === undefined && e.name === "AppError";
});

test("AppError accepts custom status and code", () => {
  const e = new AppError("bad input", 400, "validation_error");
  return e.status === 400 && e.code === "validation_error";
});

test("AppError is instanceof Error", () => {
  return new AppError("test") instanceof Error;
});

// UnauthorizedError
test("UnauthorizedError has default message and 401", () => {
  const e = new UnauthorizedError();
  return e.message === "Unauthorized" && e.status === 401 && e.code === "unauthorized";
});

test("UnauthorizedError accepts custom message", () => {
  const e = new UnauthorizedError("Invalid token");
  return e.message === "Invalid token" && e.status === 401;
});

test("UnauthorizedError is instanceof AppError", () => {
  return new UnauthorizedError() instanceof AppError;
});

// NotFoundError
test("NotFoundError has default message and 404", () => {
  const e = new NotFoundError();
  return e.message === "Not found" && e.status === 404 && e.code === "not_found";
});

test("NotFoundError accepts custom message", () => {
  const e = new NotFoundError("Model not found");
  return e.message === "Model not found" && e.status === 404;
});

// RateLimitError
test("RateLimitError has default message and 429", () => {
  const e = new RateLimitError();
  return e.message === "Rate limit exceeded" && e.status === 429 && e.code === "rate_limit_exceeded";
});

test("RateLimitError accepts custom message", () => {
  const e = new RateLimitError("Too many requests, slow down");
  return e.message === "Too many requests, slow down" && e.status === 429;
});

// InsufficientBalanceError
test("InsufficientBalanceError has default message and 402", () => {
  const e = new InsufficientBalanceError();
  return e.message === "Insufficient balance" && e.status === 402 && e.code === "insufficient_balance";
});

test("InsufficientBalanceError accepts custom message", () => {
  const e = new InsufficientBalanceError("Add credits");
  return e.message === "Add credits" && e.status === 402;
});

// Inheritance chain
test("all error subclasses are instanceof Error", () => {
  return [new UnauthorizedError(), new NotFoundError(), new RateLimitError(), new InsufficientBalanceError()]
    .every(e => e instanceof Error && e instanceof AppError);
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
