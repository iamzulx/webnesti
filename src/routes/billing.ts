import { Hono } from "hono";
import { dbAll, dbGet, dbRun } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

const billing = new Hono();
billing.use("*", authMiddleware);

// POST /api/billing/topup — simulate top-up (Midtrans integration later)
billing.post("/topup", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const amount = parseFloat(body.amount || "0");

  if (!amount || amount <= 0) {
    return c.json({ error: { message: "amount must be > 0" } }, 400);
  }

  const txId = uuidv4();

  // Add balance
  dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [amount, user.id]);

  // Log transaction
  dbRun("INSERT INTO billing_transactions (id, user_id, type, amount, description) VALUES (?, ?, ?, ?, ?)",
    [txId, user.id, "topup", amount, `Top-up $${amount}`]);

  const updated = dbGet("SELECT balance FROM users WHERE id = ?", [user.id]);

  return c.json({
    transaction_id: txId,
    type: "topup",
    amount,
    balance: updated?.balance || 0,
    message: `$${amount} added to balance`,
  }, 201);
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
