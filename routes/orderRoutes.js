const express = require("express");
const router  = express.Router();
const {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStats,
} = require("../controllers/orderController");
const { protect, adminProtect } = require("../middleware/auth");

// ✅ Public — guest checkout
router.post("/",          createOrder);

// ✅ Stats — must be before /:id
router.get("/stats",      adminProtect, getOrderStats);

// ✅ Logged-in user orders — must be before /:id
router.get("/my",         protect,      getMyOrders);

// ✅ Admin only
router.get("/",           adminProtect, getAllOrders);
router.get("/:id",        adminProtect, getOrderById);
router.put("/:id/status", adminProtect, updateOrderStatus);

module.exports = router;
