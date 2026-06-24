import { Hono } from "hono";
import { dbGet, dbRun } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";
import midtransClient from "midtrans-client";
import { createHash, timingSafeEqual } from "crypto";
import { config } from "../config.js";
import { logger } from "../logger.js";

const midtrans = new Hono();

// NOTE: auth is applied per-route, NOT globally. The /callback webhook is an
// unauthenticated server-to-server notification from Midtrans (it cannot present
// a user's wn_ API key); it is authenticated by the SHA-512 signature check
// below. Gating it with authMiddleware made every notification 401, so top-ups
// could never settle and the signature verification was unreachable.

// POST /api/midtrans/create — create Snap transaction
midtrans.post("/create", authMiddleware, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const amount = parseFloat(body.amount || "0");
  if (!amount || amount < 1000) {
    return c.json({ error: { message: "Minimum top-up Rp1.000" } }, 400);
  }

  if (!config.midtransServerKey) {
    return c.json({ error: { message: "Payment gateway not configured" } }, 503);
  }

  const snap = new midtransClient.Snap({
    isProduction: config.midtransIsProduction,
    serverKey: config.midtransServerKey,
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
        finish: `http://localhost:${config.port}/dashboard/billing`,
      },
    });

    dbRun("INSERT INTO billing_transactions (id, user_id, type, amount, description) VALUES (?, ?, ?, ?, ?)",
      [orderId, user.id, "midtrans_pending", amount, `Midtrans top-up Rp${amount.toLocaleString()}`]);

    return c.json({
      order_id: orderId,
      snap_token: transaction.token,
      snap_redirect_url: transaction.redirect_url,
      amount,
    });
  } catch (err: any) {
    logger.error("midtrans create error", { error: err?.message });
    return c.json({ error: { message: "Payment gateway error. Please try again." } }, 502);
  }
});

// POST /api/midtrans/callback — Midtrans notification callback with signature verification
midtrans.post("/callback", async (c) => {
  const body = await c.req.json().catch(() => ({}));

  if (!config.midtransServerKey) {
    return c.json({ error: "Server configuration error" }, 500);
  }

  // Reject early if required signature fields are missing.
  if (
    typeof body.order_id !== "string" ||
    typeof body.status_code !== "string" ||
    typeof body.gross_amount !== "string" ||
    typeof body.signature_key !== "string"
  ) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  // Verify signature: SHA512(order_id + status_code + gross_amount + serverKey)
  const expectedSignature = createHash("sha512")
    .update(`${body.order_id}${body.status_code}${body.gross_amount}${config.midtransServerKey}`)
    .digest("hex");

  // Use constant-time comparison to prevent timing oracle attacks.
  const sigBuf = Buffer.from(body.signature_key, "utf8");
  const expectedBuf = Buffer.from(expectedSignature, "utf8");
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    logger.warn("midtrans invalid signature", { order_id: body.order_id });
    return c.json({ error: "Invalid signature" }, 403);
  }

  const snap = new midtransClient.Snap({
    isProduction: config.midtransIsProduction,
    serverKey: config.midtransServerKey,
  });

  try {
    const status = await snap.transaction.notification(body);
    const orderId = status.order_id;
    const transactionStatus = status.transaction_status;
    const fraudStatus = status.fraud_status;

    if (transactionStatus === "capture" || transactionStatus === "settlement") {
      if (fraudStatus === "accept") {
        const tx = dbGet("SELECT * FROM billing_transactions WHERE id = ?", [orderId]);
        if (tx && tx.type === "midtrans_pending") {
          dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [tx.amount, tx.user_id]);
          dbRun("UPDATE billing_transactions SET type = 'midtrans_settled', description = ? WHERE id = ?",
            [`Midtrans settled Rp${tx.amount.toLocaleString()}`, orderId]);
        }
      }
    }

    return c.json({ status: "ok", order_id: orderId, transaction_status: transactionStatus });
  } catch (err: any) {
    logger.error("midtrans callback error", { error: err?.message });
    return c.json({ error: "Callback processing error" }, 500);
  }
});

export default midtrans;
