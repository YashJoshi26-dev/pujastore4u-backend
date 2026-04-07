const asyncHandler = require("express-async-handler");
const Order   = require("../models/Order");
const Product = require("../models/Product");
const User    = require("../models/User");

// GET /api/dashboard/stats
const getDashboardStats = asyncHandler(async (req, res) => {
  const now       = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    allOrders, lastMonthOrders,
    allUsers,  lastMonthUsers,
  ] = await Promise.all([
    Order.find(),
    Order.find({ createdAt: { $gte: lastMonth, $lte: lastMonthEnd } }),
    User.find(),
    User.find({ createdAt: { $gte: lastMonth, $lte: lastMonthEnd } }),
  ]);

  // ── Revenue ──────────────────────────────────────────────────────────────────
  const totalRevenue     = allOrders.reduce((s, o) => s + (o.total || 0), 0);
  const thisMonthRevenue = allOrders.filter(o => o.createdAt >= thisMonth).reduce((s, o) => s + (o.total || 0), 0);
  const lastMonthRevenue = lastMonthOrders.reduce((s, o) => s + (o.total || 0), 0);
  const revenueGrowth    = lastMonthRevenue > 0 ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0;

  // ── Orders ───────────────────────────────────────────────────────────────────
  const totalOrders      = allOrders.length;
  const thisMonthOrders  = allOrders.filter(o => o.createdAt >= thisMonth).length;
  const ordersGrowth     = lastMonthOrders.length > 0 ? Math.round(((thisMonthOrders - lastMonthOrders.length) / lastMonthOrders.length) * 100) : 0;

  // ── Customers ─────────────────────────────────────────────────────────────────
  const totalCustomers        = allUsers.length;
  const newCustomersThisMonth = allUsers.filter(u => u.createdAt >= thisMonth).length;
  const customersGrowth       = lastMonthUsers.length > 0 ? Math.round(((newCustomersThisMonth - lastMonthUsers.length) / lastMonthUsers.length) * 100) : 0;

  // ── Order status breakdown ────────────────────────────────────────────────────
  const pendingOrders   = allOrders.filter(o => o.status === "Processing").length;
  const deliveredOrders = allOrders.filter(o => o.status === "Delivered").length;
  const cancelledOrders = allOrders.filter(o => o.status === "Cancelled").length;

  // ── Monthly arrays (last 12 months) ──────────────────────────────────────────
  const monthlyRevenue   = Array(12).fill(0);
  const monthlyOrders    = Array(12).fill(0);
  const monthlyCustomers = Array(12).fill(0);

  allOrders.forEach(o => {
    const m = new Date(o.createdAt).getMonth();
    monthlyRevenue[m] += o.total || 0;
    monthlyOrders[m]  += 1;
  });
  allUsers.forEach(u => {
    const m = new Date(u.createdAt).getMonth();
    monthlyCustomers[m] += 1;
  });

  res.json({
    totalRevenue,
    totalOrders,
    totalCustomers,
    conversionRate:       totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0,
    revenueGrowth,
    ordersGrowth,
    customersGrowth,
    conversionGrowth:     0,
    pendingOrders,
    deliveredOrders,
    cancelledOrders,
    newCustomersThisMonth,
    monthlyRevenue,
    monthlyOrders,
    monthlyCustomers,
  });
});

module.exports = { getDashboardStats };
