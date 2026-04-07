const asyncHandler = require("express-async-handler");
const jwt   = require("jsonwebtoken");
const User  = require("../models/User");
const Admin = require("../models/Admin");

// ─── Generate JWT ─────────────────────────────────────────────────────────────
const generateToken = (id, role = "user") => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// ─── @route  POST /api/auth/register ─────────────────────────────────────────
// ─── @access Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Please fill all required fields" });
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: "User already exists with this email" });
  }

  const user = await User.create({ name, email, password, phone });

  res.status(201).json({
    _id:   user._id,
    name:  user.name,
    email: user.email,
    phone: user.phone,
    token: generateToken(user._id, "user"),
  });
});

// ─── @route  POST /api/auth/login ────────────────────────────────────────────
// ─── @access Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Please enter email and password" });
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  res.json({
    _id:   user._id,
    name:  user.name,
    email: user.email,
    phone: user.phone,
    token: generateToken(user._id, "user"),
  });
});

// ─── @route  POST /api/auth/admin/login ──────────────────────────────────────
// ─── @access Public
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Please enter email and password" });
  }

  const admin = await Admin.findOne({ email }).select("+password");
  if (!admin || !(await admin.matchPassword(password))) {
    return res.status(401).json({ message: "Invalid admin credentials" });
  }

  res.json({
    _id:     admin._id,
    name:    admin.name,
    email:   admin.email,
    store:   admin.store,
    plan:    admin.plan,
    token:   generateToken(admin._id, "admin"),
  });
});

// ─── @route  GET /api/auth/me ─────────────────────────────────────────────────
// ─── @access Private (user)
const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

module.exports = { registerUser, loginUser, loginAdmin, getMe };