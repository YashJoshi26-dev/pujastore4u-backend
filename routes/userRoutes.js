const express = require("express");
const router  = express.Router();
const { getAllUsers, getUserById, updateProfile, deleteUser } = require("../controllers/userController");
const { protect, adminProtect } = require("../middleware/auth");

// Logged-in user
router.put("/profile", protect, updateProfile);

// Admin only
router.get("/",     adminProtect, getAllUsers);
router.get("/:id",  adminProtect, getUserById);
router.delete("/:id", adminProtect, deleteUser);

module.exports = router;