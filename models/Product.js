const mongoose = require("mongoose");

// ─── All valid categories including Pujan Samagri subcategories ───────────────
const VALID_CATEGORIES = [
  // Main categories
  "Fashion", "Hardware & Tools", "Electronics", "Home & Kitchen Care",
  "Stationary", "Organisers", "Toys", "Decoration", "Gifting Products",
  "Jewellery", "Gardening", "KIDS Accessories", "Women Accessories",
  "Beauty & Body Care",

  // Pujan Samagri + subcategories
  "Pujan Samagri", "Laddu Gopal Shringar", "Hanuman Ji Vastra",
  "Radha Krishna Vastra", "Ganesh Ji Vastra", "Mata Chunri",

  // Seasonable
  "Holi", "Raksha Bandhan", "Summer", "Winter", "Rainy",
];

const productSchema = new mongoose.Schema({
  title: {
    type:     String,
    required: [true, "Product name is required"],
    trim:     true,
  },
  description: {
    type:    String,
    default: "",
  },
  category: {
    type:     String,
    required: [true, "Category is required"],
    enum:     VALID_CATEGORIES,
  },
  brand: {
    type:    String,
    default: "PoojaStore4u",
  },
  price: {
    type:     Number,
    required: [true, "Price is required"],
    min:      0,
  },
  oldPrice: {
    type:    Number,
    default: null,
  },
  stock: {
    type:     Number,
    required: [true, "Stock is required"],
    min:      0,
    default:  0,
  },
  images: {
    type:    [String],
    default: [],
  },
  image: {
    type:    String,
    default: "",
  },
  rating: {
    type:    Number,
    default: 0,
    min:     0,
    max:     5,
  },
  reviews: {
    type:    Number,
    default: 0,
  },
  sku: {
    type:    String,
    default: "",
  },
  tags: {
    type:    [String],
    default: [],
  },
  status: {
    type:    String,
    enum:    ["active", "draft", "inactive"],
    default: "active",
  },
  specifications: {
    weight:   { type: String, default: "N/A" },
    warranty: { type: String, default: "N/A" },
    brand:    { type: String, default: "" },
  },
}, { timestamps: true });

productSchema.index({ title: "text", category: 1, status: 1 });

module.exports = mongoose.model("Product", productSchema);