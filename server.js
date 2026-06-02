require("dotenv").config();

const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");

// ─── Connect to MongoDB ───────────────────────────────────────────────────────
connectDB();

const app = express();

app.set('trust proxy', 1);

// ─── Security Headers (helmet) ────────────────────────────────────────────────
app.use(helmet());

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per IP per 15 min
  message: { message: "Too many requests, please try again later." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // only 10 login attempts per 15 min
  message: { message: "Too many login attempts, please try again later." },
});
app.use("/api/", limiter);
app.use("/api/auth/login", authLimiter);

// ─── CORS — only allow your domains ──────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://poojastore4u.com",
  "https://www.poojastore4u.com",
];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // ✅ preflight requests handle karo

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use("/api/payment/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    if (Buffer.isBuffer(req.body)) req.body = JSON.parse(req.body.toString());
    next();
  }
);
app.use(express.urlencoded({ extended: true }));
app.use("/api/ai", require("./routes/aiRoutes"));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",      require("./routes/authRoutes"));
app.use("/api/products",  require("./routes/productRoutes"));
app.use("/api/orders",    require("./routes/orderRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/users",     require("./routes/userRoutes"));
app.use("/api/payment",   require("./routes/paymentRoutes"));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "PoojaStore4u API is running ✅", status: "ok" });
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ─── Global error handler — never leak stack trace in production ──────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    // ✅ stack only shown in development — never in production
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
