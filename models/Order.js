const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product:         { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  title:           String,
  price:           Number,
  quantity:        Number,
  image:           String,
  sku:             String,
  selectedVariant: { type: mongoose.Schema.Types.Mixed, default: null },
});

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type:    String,
      unique:  true,
    },
    invoiceNumber: { type: String },
    user:          { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    customerInfo: {
      name:  { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    deliveryAddress: {
      address: { type: String, required: true },
      city:    { type: String, required: true },
      state:   String,
      pincode: { type: String, required: true },
    },
    items:         [orderItemSchema],
    subtotal:      { type: Number, default: 0 },
    shipping:      { type: Number, default: 0 },
    total:         { type: Number, default: 0 },
    paymentMethod: { type: String, default: "cod" },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    status: {
      type:    String,
      enum:    ["Processing", "Ready to Ship", "Shipped", "Delivered", "Cancelled", "Refund Processed"],
      default: "Processing",
    },
    razorpayOrderId:   String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    logisticPartner:   String,
    trackingNumber:    String,
  },
  { timestamps: true }
);

// Auto-generate orderId
orderSchema.pre("save", async function (next) {
  if (!this.orderId) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderId = `#ORD-${1000 + count + 1}`;
  }
  if (!this.invoiceNumber) {
    const count = await mongoose.model("Order").countDocuments();
    const year  = new Date().getFullYear();
    this.invoiceNumber = `${year}/${1000 + count + 1}`;
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);
