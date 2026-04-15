require("dotenv").config(); // ✅ MUST be absolute first line

const express   = require("express");
const cors      = require("cors");
const connectDB = require("./config/db");

// ─── Debug — should now show your MongoDB URI ─────────────────────────────────
console.log("🔍 MONGO_URI:", process.env.MONGO_URI); // ✅ fixed: MONGO_URI not MONGODB_URI

// ─── Connect to MongoDB ───────────────────────────────────────────────────────
connectDB();

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
}));
app.use(express.json());
app.use("/api/payment/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    if (Buffer.isBuffer(req.body)) req.body = JSON.parse(req.body.toString())
    next()
  }
)
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",     require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/orders",   require("./routes/orderRoutes"));
app.use("/api/users",    require("./routes/userRoutes"));

app.use("/api/payment", require("./routes/paymentRoutes"));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "PoojaStore4u API is running ✅", status: "ok" });
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
