import { Hono } from "hono";
import { dbGet, dbRun } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";
import midtransClient from "midtrans-client";

const midtrans = new Hono();
midtrans.use("*", authMiddleware);

// POST /api/billing/midtrans/create — create Snap transaction
midtrans.post("/create", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const amount = parseFloat(body.amount || "0");
  if (!amount || amount < 1000) {
    return c.json({ error: { message: "Minimum top-up Rp1.000" } }, 400);
  }

  const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY || "SB-Mid-server-xxx",
  });

  const orderId = `webnesti-${Date.now()}-${uuidv4().slice(0, 8)}`;

  try {
    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        email: user.email,
        first_name: user.name || "User",
      },
      callbacks: {
        finish: `http://localhost:${process.env.PORT || 2019}/dashboard/billing`,
      },
    });

    // Store pending transaction
    dbRun("INSERT INTO billing_transactions (id, user_id, type, amount, description) VALUES (?, ?, ?, ?, ?)",
      [orderId, user.id, "midtrans_pending", amount, `Midtrans top-up Rp${amount.toLocaleString()}`]);

    return c.json({
      order_id: orderId,
      snap_token: transaction.token,
      snap_redirect_url: transaction.redirect_url,
      amount,
    });
  } catch (err: any) {
    return c.json({ error: { message: err.message || "Midtrans error" } }, 502);
  }
});

// POST /api/billing/midtrans/callback — Midtrans notification callback
midtrans.post("/callback", async (c) => {
  const body = await c.req.json().catch(() => ({}));

  const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY || "SB-Mid-server-xxx",
  });

  try {
    const status = await snap.transaction.notification(body);
    const orderId = status.order_id;
    const transactionStatus = status.transaction_status;
    const fraudStatus = status.fraud_status;

    if (transactionStatus === "capture" || transactionStatus === "settlement") {
      if (fraudStatus === "accept") {
        // Find the pending transaction
        const tx = dbGet("SELECT * FROM billing_transactions WHERE id = ?", [orderId]);
        if (tx && tx.type === "midtrans_pending") {
          // Credit user balance
          dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [tx.amount, tx.user_id]);
          // Update transaction status
          dbRun("UPDATE billing_transactions SET type = 'midtrans_settled', description = ? WHERE id = ?",
            [`Midtrans settled Rp${tx.amount.toLocaleString()}`, orderId]);
        }
      }
    }

    return c.json({ status: "ok", order_id: orderId, transaction_status: transactionStatus });
  } catch (err: any) {
    return c.json({ error: { message: err.message || "Callback error" } }, 500);
  }
});

export default midtrans;
