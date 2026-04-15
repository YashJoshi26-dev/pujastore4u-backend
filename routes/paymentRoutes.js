const express = require("express");
const router  = express.Router();
const {
  createRazorpayOrder,
  verifyPayment,
  webhookHandler,
} = require("../controllers/razorpayController");

// POST /api/payment/create-order  → creates Razorpay order
router.post("/create-order", createRazorpayOrder);

// POST /api/payment/verify        → verifies payment signature
router.post("/verify",       verifyPayment);

// POST /api/payment/webhook       → Razorpay webhook (raw body needed)
router.post("/webhook",      webhookHandler);

module.exports = router;
