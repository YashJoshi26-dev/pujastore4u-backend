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

  // ✅ FIX: Validate stock but skip if product not found in DB
  // This handles cases where product ID is from old local data
  const stockErrors = [];
  for (const item of items) {
    try {
      const product = await Product.findById(item.product);
      if (product && product.stock < item.quantity) {
        stockErrors.push(`Insufficient stock for ${item.title}`);
      }
    } catch (e) {
      // Invalid product ID format — skip validation, still allow order
      console.log(`Product ID ${item.product} not found, skipping stock check`);
    }
  }

  if (stockErrors.length > 0) {
    return res.status(400).json({ message: stockErrors[0] });
  }

  // ✅ Create order — works for both guests and logged-in users
  const order = await Order.create({
    user:            req.user?._id || null,
    customerInfo,
    deliveryAddress,
    items,
    subtotal:        Number(subtotal) || 0,
    shipping:        Number(shipping) || 0,
    total:           Number(total)    || 0,
    paymentMethod:   paymentMethod    || "cod",
    paymentStatus:   paymentMethod === "cod" ? "pending" : "paid",
  });

  // ✅ Deduct stock for valid products only
  for (const item of items) {
    try {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    } catch (e) {
      console.log(`Could not update stock for product ${item.product}`);
    }
  }

  console.log(`✅ New order created: ${order.orderId} — ${customerInfo.name} — ₹${total}`);
  res.status(201).json(order);
});

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
  const validStatuses = ["Processing", "Shipped", "Delivered", "Cancelled"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status },
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