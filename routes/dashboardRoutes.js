const express = require("express");
const router  = express.Router();
const Order   = require("../models/Order");
const Product = require("../models/Product");
const User    = require("../models/User");
const { adminProtect } = require("../middleware/auth");

router.get("/stats", adminProtect, async (req, res) => {
  try {
    const now       = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalOrders, delivered, shipped, cancelled, processing,
      revenueAgg, lastMonthRevenueAgg,
      totalOrdersLastMonth,
      totalProducts,
      totalCustomers, newCustomersThisMonth,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: "Delivered" }),
      Order.countDocuments({ status: "Shipped" }),
      Order.countDocuments({ status: "Cancelled" }),
      Order.countDocuments({ status: "Processing" }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]),
      Order.aggregate([
        { $match: { createdAt: { $gte: lastMonth, $lte: lastMonthEnd } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Order.countDocuments({ createdAt: { $lt: thisMonth } }),
      Product.countDocuments({ status: "active" }),
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: thisMonth } }),
    ]);

    const totalRevenue     = revenueAgg[0]?.total     || 0;
    const lastMonthRevenue = lastMonthRevenueAgg[0]?.total || 0;

    // Monthly breakdown for charts (last 12 months)
    const monthlyData = await Order.aggregate([
      {
        $group: {
          _id: {
            year:  { $year:  "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$total" },
          orders:  { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
    ]);

    const monthlyRevenue   = Array(12).fill(0);
    const monthlyOrders    = Array(12).fill(0);
    const monthlyCustomers = Array(12).fill(0);

    monthlyData.forEach(m => {
      const idx = m._id.month - 1;
      monthlyRevenue[idx] = m.revenue;
      monthlyOrders[idx]  = m.orders;
    });

    const revenueGrowth = lastMonthRevenue > 0
      ? Math.round(((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 0;

    const ordersGrowth = totalOrdersLastMonth > 0
      ? Math.round(((totalOrders - totalOrdersLastMonth) / totalOrdersLastMonth) * 100)
      : 0;

    res.json({
      totalRevenue,
      totalOrders,
      totalCustomers,
      totalProducts,
      delivered,
      shipped,
      cancelledOrders:      cancelled,
      pendingOrders:        processing,
      deliveredOrders:      delivered,
      newCustomersThisMonth,
      revenueGrowth,
      ordersGrowth,
      customersGrowth:      0,
      conversionRate:       totalOrders > 0 ? ((delivered / totalOrders) * 100).toFixed(1) : 0,
      monthlyRevenue,
      monthlyOrders,
      monthlyCustomers,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;