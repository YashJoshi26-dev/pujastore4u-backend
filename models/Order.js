const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product:  { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  title:    { type: String, required: true },
  image:    { type: String, default: "" },
  price:    { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,   // null = guest checkout
  },
  // Customer info (for both guests and logged-in users)
  customerInfo: {
    name:    { type: String, required: true },
    email:   { type: String, required: true },
    phone:   { type: String, required: true },
  },
  // Delivery address
  deliveryAddress: {
    address: { type: String, required: true },
    city:    { type: String, required: true },
    state:   { type: String, default: "" },
    pincode: { type: String, required: true },
  },
  // Order items
  items: [orderItemSchema],

  // Pricing
  subtotal: { type: Number, required: true },
  shipping: { type: Number, default: 0 },
  total:    { type: Number, required: true },

  // Payment
  paymentMethod: {
    type: String,
    enum: ["upi", "card", "cod"],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },

  // Order status
  status: {
    type: String,
    enum: ["Processing", "Shipped", "Delivered", "Cancelled"],
    default: "Processing",
  },

  // Auto-generated order ID like #ORD-9812
  orderId: {
    type: String,
    unique: true,
  },
}, { timestamps: true });

// ─── Auto-generate orderId before saving ──────────────────────────────────────
orderSchema.pre("save", async function (next) {
  if (!this.orderId) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderId = `#ORD-${1000 + count + 1}`;
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);