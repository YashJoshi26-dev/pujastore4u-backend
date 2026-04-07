const asyncHandler = require("express-async-handler");
const User  = require("../models/User");
const Order = require("../models/Order");

// ─── GET /api/users — Admin only ─────────────────────────────────────────────
// ✅ FIX: Now includes orderCount and totalSpent for each user
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });

  // ✅ Add order stats for each user
  const usersWithStats = await Promise.all(
    users.map(async (user) => {
      const orders = await Order.find({ user: user._id });
      const orderCount = orders.length;
      const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
      return {
        ...user.toObject(),
        orderCount,
        totalSpent,
      };
    })
  );

  res.json(usersWithStats);
});

// ─── GET /api/users/:id — Admin only ─────────────────────────────────────────
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const orders = await Order.find({ user: req.params.id }).sort({ createdAt: -1 });
  const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  res.json({
    ...user.toObject(),
    orders,
    orderCount: orders.length,
    totalSpent,
  });
});

// ─── PUT /api/users/profile — Logged-in user ─────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.name    = req.body.name    || user.name;
  user.phone   = req.body.phone   || user.phone;
  user.address = req.body.address || user.address;

  if (req.body.password) user.password = req.body.password;

  const updated = await user.save();
  res.json({
    _id:     updated._id,
    name:    updated.name,
    email:   updated.email,
    phone:   updated.phone,
    address: updated.address,
  });
});

// ─── DELETE /api/users/:id — Admin only ──────────────────────────────────────
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  await user.deleteOne();
  res.json({ message: "User deleted successfully" });
});

module.exports = { getAllUsers, getUserById, updateProfile, deleteUser };