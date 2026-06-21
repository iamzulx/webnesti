export class AppError extends Error {
  constructor(public message: string, public status: number = 500, public code?: string) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(msg = "Unauthorized") { super(msg, 401, "unauthorized"); }
}

export class NotFoundError extends AppError {
  constructor(msg = "Not found") { super(msg, 404, "not_found"); }
}

export class RateLimitError extends AppError {
  constructor(msg = "Rate limit exceeded") { super(msg, 429, "rate_limit_exceeded"); }
}

export class InsufficientBalanceError extends AppError {
  constructor(msg = "Insufficient balance") { super(msg, 402, "insufficient_balance"); }
}
