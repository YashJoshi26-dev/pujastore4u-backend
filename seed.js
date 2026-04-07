require("dotenv").config(); // ✅ must be first line

const mongoose = require("mongoose");
const Admin    = require("./models/Admin");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Delete existing admin
    await Admin.deleteMany({});
    console.log("🗑️  Cleared existing admins");

    // Create admin from .env credentials
    await Admin.create({
      name:       "DiziVeera",
      email:      process.env.ADMIN_EMAIL,
      password:   process.env.ADMIN_PASSWORD,
      store:      "PoojaStore4u",
      phone:      "+91 98765 43210",
      gst:        "27AABCU9603R1ZX",
      location:   "Mumbai, Maharashtra",
      plan:       "Pro Seller",
      planExpiry: "Apr 1, 2027",
    });

    console.log(`✅ Admin created: ${process.env.ADMIN_EMAIL}`);
    console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD}`);
    console.log("🎉 Seed complete — you can now log in!");

  } catch (err) {
    console.error("❌ Seed failed:", err.message);
  } finally {
    process.exit();
  }
}

seed();