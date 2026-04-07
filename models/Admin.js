const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: "DiziVeera",
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  store:    { type: String, default: "PoojaStore4u" },
  phone:    { type: String, default: "" },
  gst:      { type: String, default: "" },
  location: { type: String, default: "" },
  plan:     { type: String, default: "Pro Seller" },
  planExpiry: { type: String, default: "Apr 1, 2027" },
}, { timestamps: true });

adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

adminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);