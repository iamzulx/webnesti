import { Hono } from "hono";
import { dbAll, dbGet, dbRun } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";

const billing = new Hono();
billing.use("*", authMiddleware);

// POST /api/billing/topup — DISABLED: use Midtrans payment gateway
billing.post("/topup", async (c) => {
  return c.json({
    error: {
      message: "Direct top-up disabled. Use /api/midtrans/create for payment.",
      type: "invalid_request",
    }
  }, 400);
});

// GET /api/billing/transactions — list transactions
billing.get("/transactions", (c) => {
  const user = c.get("user");
  const rows = dbAll("SELECT * FROM billing_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100", [user.id]);

  return c.json({
    object: "list",
    data: rows.map((t: any) => ({
      id: t.id, type: t.type, amount: t.amount,
      description: t.description, created_at: t.created_at,
    })),
  });
});

export default billing;
