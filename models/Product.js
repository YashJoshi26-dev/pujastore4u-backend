const mongoose = require("mongoose");

const VALID_CATEGORIES = [
  "Fashion", "Hardware & Tools", "Electronics", "Home & Kitchen Care",
  "Stationary", "Organisers", "Toys", "Decoration", "Gifting Products",
  "Jewellery", "Gardening", "KIDS Accessories", "Women Accessories",
  "Beauty & Body Care",
  "Pujan Samagri", "Laddu Gopal Shringar", "Hanuman Ji Vastra",
  "Radha Krishna Vastra", "Ganesh Ji Vastra", "Mata Chunri",
  "Holi", "Raksha Bandhan", "Summer", "Winter", "Rainy",
];

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Product name is required"],
    trim: true,
  },
  description: {
    type: String,
    default: "",
  },

  // ✅ MULTI-CATEGORY: array — product appears in all selected categories
  categories: {
    type: [String],
    enum: VALID_CATEGORIES,
    default: [],
  },

  // ✅ Keep single category for backward compat — always = categories[0]
  category: {
    type: String,
    enum: VALID_CATEGORIES,
    default: "",
  },

  brand: {
    type: String,
    default: "PoojaStore4u",
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: 0,
  },
  oldPrice: {
    type: Number,
    default: null,
  },
  stock: {
    type: Number,
    required: [true, "Stock is required"],
    min: 0,
    default: 0,
  },
  weight: {
    type: Number,
    default: 0,
  },
  images: {
    type: [String],
    default: [],
  },
  image: {
    type: String,
    default: "",
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviews: {
    type: Number,
    default: 0,
  },
  sku: {
    type: String,
    default: "",
    sparse: true, 
  },
  tags: {
    type: [String],
    default: [],
  },
  featured: {
    type: Boolean,
    default: false,
  },

  salesCount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["active", "draft", "inactive"],
    default: "active",
  },
  specifications: {
    weight: { type: String, default: "N/A" },
    warranty: { type: String, default: "N/A" },
    brand: { type: String, default: "" },
  },
  variants: [{
    size: { type: String, default: "" },
    color: { type: String, default: "" },
    design: { type: String, default: "" },
    sku: { type: String, default: "" },
    price: { type: Number, default: 0 },   // selling price
    mrp: { type: Number, default: 0 },   // MRP per variant
    weight: { type: Number, default: 0 },   // weight per variant (internal only)
    stock: { type: Number, default: 0 },
    image: { type: String, default: "" },
  }],
}, { timestamps: true });

// ✅ Index for fast $in queries on categories array
productSchema.index({ categories: 1 });
productSchema.index({ category: 1 });
productSchema.index({ title: "text" });
productSchema.index({ status: 1 });
productSchema.index({ sku: 1 }, { unique: true, sparse: true });


module.exports = mongoose.model("Product", productSchema);
