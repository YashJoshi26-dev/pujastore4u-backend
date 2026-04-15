const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  title: { type: String, required: true },
  image: { type: String, default: "" },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  sku: { type: String, default: "" },
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,   // null = guest checkout
  },
  // Customer info (for both guests and logged-in users)
  customerInfo: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  // Delivery address
  deliveryAddress: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, default: "" },
    pincode: { type: String, required: true },
  },
  // Order items
  items: [orderItemSchema],

  // Pricing
  subtotal: { type: Number, required: true },
  shipping: { type: Number, default: 0 },
  total: { type: Number, required: true },

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
  razorpayOrderId: { type: String, default: "" },
  razorpayPaymentId: { type: String, default: "" },
  razorpaySignature: { type: String, default: "" },

  status: {
    type: String,
    enum: ["Processing", "Ready to Ship", "Shipped", "Delivered", "Cancelled", "Refund Processed"],
    default: "Processing",
  },

  logisticPartner: { type: String, default: "" },
  trackingNumber: { type: String, default: "" },
  deliveryTime: { type: String, default: "5-7 business days" },
  // Auto-generated order ID like #ORD-9812
  orderId: {
  type: String,
  unique: true,
},
invoiceNumber: {
  type: String,
  unique: true,
  sparse: true,
},
}, { timestamps: true });

orderSchema.pre("save", async function (next) {
  if (!this.orderId) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderId = `#ORD-${1000 + count + 1}`;
  }
  if (!this.invoiceNumber) {
    const InvoiceCounter = mongoose.connection.collection("invoicecounters");
    const currentYear = new Date().getFullYear();
    const result = await InvoiceCounter.findOneAndUpdate(
      { _id: "invoiceCounter" },
      [{ $set: {
          seq: { $cond: { if: { $eq: ["$year", currentYear] }, then: { $add: ["$seq", 1] }, else: 1001 } },
          year: currentYear
      }}],
      { upsert: true, returnDocument: "after" }
    );
    const seq = result?.seq ?? 1001;
    this.invoiceNumber = `2627/${String(seq).padStart(4, "0")}`;
  }
  next();
});




module.exports = mongoose.model("Order", orderSchema);