const Razorpay = require("razorpay");
const crypto   = require("crypto");
const Order    = require("../models/Order");

// ─── Init Razorpay instance ───────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── 1. Create Razorpay Order ─────────────────────────────────────────────────
// POST /api/payment/create-order
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount, orderId } = req.body; // amount in rupees, orderId = your DB order _id

    if (!amount || !orderId) {
      return res.status(400).json({ message: "amount and orderId are required" });
    }

    const options = {
      amount:   Math.round(amount * 100), // Razorpay needs paise
      currency: "INR",
      receipt:  `receipt_${orderId}`,
      notes:    { orderId },
    };

    const razorpayOrder = await razorpay.orders.create(options);

    res.json({
      razorpayOrderId: razorpayOrder.id,
      amount:          razorpayOrder.amount,
      currency:        razorpayOrder.currency,
      keyId:           process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Razorpay create order error:", err);
    res.status(500).json({ message: "Failed to create payment order" });
  }
};

// ─── 2. Verify Payment (HMAC SHA256) ─────────────────────────────────────────
// POST /api/payment/verify
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId, // your MongoDB order _id
    } = req.body;

    // ── Step 1: Verify signature ──────────────────────────────────────────────
    const body      = razorpay_order_id + "|" + razorpay_payment_id;
    const expected  = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      // Signature mismatch — mark order as failed
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: "failed",
        razorpayOrderId:   razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      });
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    // ── Step 2: Update order as paid ──────────────────────────────────────────
    const updated = await Order.findByIdAndUpdate(
      orderId,
      {
        paymentStatus:     "paid",
        razorpayOrderId:   razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({
      success:  true,
      message:  "Payment verified successfully",
      orderId:  updated.orderId,  // your #ORD-XXXX
      _id:      updated._id,
    });
  } catch (err) {
    console.error("Razorpay verify error:", err);
    res.status(500).json({ success: false, message: "Payment verification error" });
  }
};

// ─── 3. Webhook Handler ───────────────────────────────────────────────────────
// POST /api/payment/webhook
// Must use raw body — set up in server.js BEFORE express.json()
exports.webhookHandler = async (req, res) => {
  try {
    const webhookSecret   = process.env.RAZORPAY_WEBHOOK_SECRET;
    const receivedSig     = req.headers["x-razorpay-signature"];
    const body            = JSON.stringify(req.body);

    // ── Verify webhook signature ──────────────────────────────────────────────
    const expectedSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (expectedSig !== receivedSig) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event   = req.body.event;
    const payload = req.body.payload?.payment?.entity;

    // ── Handle events ─────────────────────────────────────────────────────────
    if (event === "payment.captured") {
      const razorpayOrderId = payload.order_id;
      await Order.findOneAndUpdate(
        { razorpayOrderId },
        { paymentStatus: "paid", razorpayPaymentId: payload.id }
      );
      console.log("✅ Webhook: payment captured for", razorpayOrderId);
    }

    if (event === "payment.failed") {
      const razorpayOrderId = payload.order_id;
      await Order.findOneAndUpdate(
        { razorpayOrderId },
        { paymentStatus: "failed" }
      );
      console.log("❌ Webhook: payment failed for", razorpayOrderId);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ message: "Webhook processing error" });
  }
};
