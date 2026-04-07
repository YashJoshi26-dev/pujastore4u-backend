const jwt   = require("jsonwebtoken");
const User  = require("../models/User");
const Admin = require("../models/Admin");

// ─── Protect user routes ──────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token invalid or expired" });
  }
};

// ─── Protect admin routes ─────────────────────────────────────────────────────
const adminProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied — admins only" });
    }

    req.admin = await Admin.findById(decoded.id).select("-password");
    if (!req.admin) {
      return res.status(401).json({ message: "Admin not found" });
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token invalid or expired" });
  }
};

module.exports = { protect, adminProtect };