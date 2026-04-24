const asyncHandler = require("express-async-handler");
const Order   = require("../models/Order");
const Product = require("../models/Product");

// ─── POST /api/orders — Public (guest + logged-in) ───────────────────────────
const createOrder = asyncHandler(async (req, res) => {
  const { customerInfo, deliveryAddress, items, subtotal, shipping, total, paymentMethod } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: "No items in order" });
  }

  if (!customerInfo?.name || !customerInfo?.email || !customerInfo?.phone) {
    return res.status(400).json({ message: "Customer info is required" });
  }

  if (!deliveryAddress?.address || !deliveryAddress?.city || !deliveryAddress?.pincode) {
    return res.status(400).json({ message: "Delivery address is required" });
  }

  // Validate stock
  const stockErrors = [];
  for (const item of items) {
    try {
const product = await Product.findById(item.product);
if (product) {
  const variant = item.selectedVariant
  let availableStock = product.stock

  if (variant && (variant.size || variant.color || variant.design)) {
    const matchedVariant = product.variants?.find(v =>
      (!variant.size   || v.size   === variant.size)   &&
      (!variant.color  || v.color  === variant.color)  &&
      (!variant.design || v.design === variant.design)
    )
    if (matchedVariant) availableStock = matchedVariant.stock
  }

  if (availableStock <= 0) {
    stockErrors.push(`${item.title} is out of stock`)
  } else if (availableStock < item.quantity) {
    stockErrors.push(`Only ${availableStock} unit(s) available for ${item.title}`)
  }
}
    } catch (e) {
      console.log(`Product ID ${item.product} not found, skipping stock check`);
    }
  }

  if (stockErrors.length > 0) {
    return res.status(400).json({ message: stockErrors[0] });
  }

  // ✅ Enrich items with SKU from Product DB
 const enrichedItems = await Promise.all(
  items.map(async (item) => {
    try {
      const product = await Product.findById(item.product).select("sku");
      return {
        ...item,
        sku: item.sku || product?.sku || "",
        selectedVariant: item.selectedVariant || null,
      };
    } catch {
      return { ...item, sku: item.sku || "", selectedVariant: item.selectedVariant || null };
    }
  })
);

  const order = await Order.create({
    user:          req.user?._id || null,
    customerInfo,
    deliveryAddress,
    items:         enrichedItems,
    subtotal:      Number(subtotal) || 0,
    shipping:      Number(shipping) || 0,
    total:         Number(total)    || 0,
    paymentMethod: paymentMethod    || "cod",
    paymentStatus: paymentMethod === "cod" ? "pending" : "paid",
  });

  // Deduct stock
 for (const item of items) {
  try {
    const variant = item.selectedVariant
    if (variant && (variant.size || variant.color || variant.design)) {
      // Deduct from matching variant stock
      await Product.findOneAndUpdate(
        {
          _id: item.product,
          "variants.size":   variant.size   || "",
          "variants.color":  variant.color  || "",
          "variants.design": variant.design || "",
        },
        {
          $inc: {
            "variants.$.stock": -item.quantity,
            salesCount: item.quantity,
          },
        }
      )
    } else {
      // No variant — deduct from main product stock
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity, salesCount: item.quantity },
      })
    }
  } catch (e) {
    console.log(`Could not update stock for product ${item.product}`)
  }
}

  // ✅ Send emails (non-critical — won't break order if email fails)
  try {
    const { sendOrderEmail } = require("../utils/sendEmail");
    await sendOrderEmail({
      to:      order.customerInfo.email,
      subject: `Order Confirmed: ${order.orderId}`,
      order,
    });
    await sendOrderEmail({
      to:      process.env.ADMIN_NOTIFY_EMAIL,
      subject: `New Order: ${order.orderId} — ₹${order.total}`,
      order,
    });
  } catch (emailErr) {
    console.log("Email failed (non-critical):", emailErr.message);
  }

  console.log(`✅ New order created: ${order.orderId} — ${customerInfo.name} — ₹${total}`);
  res.status(201).json(order);
}); // ✅ FIX: closing brace was missing — getAllOrders was inside createOrder

// ─── GET /api/orders — Admin only ────────────────────────────────────────────
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, search } = req.query;

  const query = {};
  if (status && status !== "All") query.status = status;
  if (search) {
    query.$or = [
      { orderId: { $regex: search, $options: "i" } },
      { "customerInfo.name":  { $regex: search, $options: "i" } },
      { "customerInfo.email": { $regex: search, $options: "i" } },
    ];
  }

  const orders = await Order.find(query)
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  res.json(orders);
});

// ─── GET /api/orders/my — Logged-in user ─────────────────────────────────────
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

// ─── GET /api/orders/:id — Admin only ────────────────────────────────────────
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "name email");
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
});

// ─── PUT /api/orders/:id/status — Admin only ─────────────────────────────────
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = [
    "Processing", "Ready to Ship", "Shipped",
    "Delivered", "Cancelled", "Refund Processed",
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const { logisticPartner, trackingNumber } = req.body;
const updateData = { status };
if (logisticPartner !== undefined) updateData.logisticPartner = logisticPartner;
if (trackingNumber  !== undefined) updateData.trackingNumber  = trackingNumber;

const order = await Order.findByIdAndUpdate(
  req.params.id,
  updateData,
  { new: true }
);

  if (!order) return res.status(404).json({ message: "Order not found" });

  console.log(`✅ Order ${order.orderId} status updated to ${status}`);
  res.json(order);
});

// ─── GET /api/orders/stats — Admin dashboard stats ───────────────────────────
const getOrderStats = asyncHandler(async (req, res) => {
  const [totalOrders, delivered, shipped, revenue] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: "Delivered" }),
    Order.countDocuments({ status: "Shipped" }),
    Order.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]),
  ]);

  res.json({
    totalOrders,
    delivered,
    shipped,
    totalRevenue: revenue[0]?.total || 0,
  });
});

module.exports = {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStats,
};