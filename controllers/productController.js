const asyncHandler   = require("express-async-handler");
const Product        = require("../models/Product");
const { cloudinary } = require("../config/cloudinary");

// ─── Helper: upload buffer to Cloudinary ─────────────────────────────────────
const uploadBufferToCloudinary = (buffer, folder = "poojastore4u/products") => {
  return new Promise((resolve, reject) => {
    if (!buffer || buffer.length === 0) return reject(new Error("Empty buffer"));
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error)               return reject(error);
        if (!result?.secure_url) return reject(new Error("No URL from Cloudinary"));
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

const uploadAllFiles = async (files) => {
  if (!files || files.length === 0) return [];
  const urls = [];
  for (const file of files) {
    try {
      const result = await uploadBufferToCloudinary(file.buffer);
      urls.push(result.secure_url);
    } catch (err) {
      console.error("Upload failed for", file.originalname, "—", err.message);
    }
  }
  return urls;
};

// ─── Helper: parse categories from FormData ───────────────────────────────────
const parseCategories = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed].filter(Boolean);
  } catch {
    return Array.isArray(raw)
      ? raw.filter(Boolean)
      : raw.split(",").map(c => c.trim()).filter(Boolean);
  }
};

// ─── GET /api/products ────────────────────────────────────────────────────────
const getProducts = asyncHandler(async (req, res) => {
  const { category, categories, brand, minPrice, maxPrice,
          rating, inStock, search, sort, status } = req.query;

  const query = status === "all" ? {} : { status: "active" };

  // ✅ Multi-category filter using $in
  if (categories) {
    const catArray = categories.split(",").map(c => c.trim()).filter(Boolean);
    // Search both categories array AND legacy category field
    query.$or = [
      { categories: { $in: catArray } },
      { category:   { $in: catArray } },
    ];
  } else if (category) {
    query.$or = [
      { categories: { $in: [category] } },
      { category:   category            },
    ];
  }

  if (brand)    query.brand = brand;
  if (inStock === "true") query.stock = { $gt: 0 };
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }
  if (rating) query.rating = { $gte: Number(rating) };
  if (search) query.$text  = { $search: search };

  let sortOption = { createdAt: -1 };
  if (sort === "low")    sortOption = { price:  1 };
  if (sort === "high")   sortOption = { price: -1 };
  if (sort === "rating") sortOption = { rating: -1 };

  const products = await Product.find(query).sort(sortOption);
  res.json(products);
});

// ─── GET /api/products/:id ────────────────────────────────────────────────────
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
});

// ─── GET /api/products/category/:name ────────────────────────────────────────
// ✅ Searches both categories array AND legacy category field
const getProductsByCategory = asyncHandler(async (req, res) => {
  const catName = decodeURIComponent(req.params.name);
  const products = await Product.find({
    $or: [
      { categories: { $in: [catName] } },
      { category:   catName            },
    ],
    status: "active",
  }).sort({ createdAt: -1 });
  res.json(products);
});

// ─── POST /api/products ───────────────────────────────────────────────────────
const createProduct = asyncHandler(async (req, res) => {
  const { title, description, brand, stock, sku, tags, status, weight } = req.body;

  // ✅ Parse categories array
  const categories = parseCategories(req.body.categories);

  // ✅ Fallback to single category for backward compat
  const legacyCategory = req.body.category || categories[0] || "";

  if (categories.length === 0 && !legacyCategory) {
    return res.status(400).json({ message: "At least one category is required" });
  }

  // ✅ Fix duplicate price key from FormData
  let price    = req.body.price;
  let oldPrice = req.body.oldPrice;
  if (Array.isArray(price)) { oldPrice = price[0]; price = price[1]; }

  const priceNum    = Number(price);
  const oldPriceNum = oldPrice ? Number(oldPrice) : null;

  if (!title)                           return res.status(400).json({ message: "Title is required" });
  if (sku) {
  const skuExists = await Product.findOne({ sku });
  if (skuExists) return res.status(400).json({ message: `SKU "${sku}" already exists. Use a unique SKU.` });
}
  if (isNaN(priceNum) || priceNum <= 0) return res.status(400).json({ message: "Valid price required" });
  if (!stock || isNaN(Number(stock)))   return res.status(400).json({ message: "Valid stock required" });

  const images = await uploadAllFiles(req.files);

  const product = await Product.create({
    title,
    description:    description || "",
    categories:     categories.length > 0 ? categories : [legacyCategory], // ✅ array
    category:       categories[0] || legacyCategory,                        // ✅ compat
    brand:          brand    || "PoojaStore4u",
    price:          priceNum,
    oldPrice:       oldPriceNum,
    stock:          Number(stock),
    weight:         Number(weight) || 0,
    sku:            sku   || "",
    tags:           tags  ? JSON.parse(tags) : [],
    featured:       req.body.featured === "true" || req.body.featured === true,
    variants:       req.body.variants ? JSON.parse(req.body.variants) : [],
    status:         status || "active",
    status:         status || "active",
    images,
    image:          images[0] || "",
  });

  console.log(`✅ Product: "${product.title}" in [${product.categories.join(", ")}]`);
  res.status(201).json(product);
});

// ─── PUT /api/products/:id ────────────────────────────────────────────────────
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  const updates = { ...req.body };

  // ✅ SKU uniqueness check — exclude current product
  if (updates.sku && updates.sku.trim() !== "") {
    const skuExists = await Product.findOne({
      sku: updates.sku.trim(),
      _id: { $ne: req.params.id },
    });
    if (skuExists) return res.status(400).json({ message: `SKU "${updates.sku}" already exists. Use a unique SKU.` });
  }

  // ✅ Parse categories array on update
  if (updates.categories) {
    updates.categories = parseCategories(updates.categories);
    updates.category   = updates.categories[0] || product.category;
  }

  if (req.files?.length > 0) {
    const newImages  = await uploadAllFiles(req.files);
    const existing   = (product.images || []).filter(Boolean);
    updates.images   = [...existing, ...newImages];
    updates.image    = updates.images[0] || "";
  }

  if (updates.tags)     updates.tags     = JSON.parse(updates.tags);
  if (updates.price)    updates.price    = Number(updates.price);
  if (updates.oldPrice) updates.oldPrice = Number(updates.oldPrice);
  if (updates.stock)    updates.stock    = Number(updates.stock);
  if (updates.featured !== undefined)
    updates.featured = updates.featured === "true" || updates.featured === true;
  if (updates.variants) updates.variants = JSON.parse(updates.variants);

  const updated = await Product.findByIdAndUpdate(
    req.params.id, updates, { new: true, runValidators: true }
  );
  res.json(updated);
});

// ─── DELETE /api/products/:id ─────────────────────────────────────────────────
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  for (const imgUrl of (product.images || []).filter(Boolean)) {
    try {
      const afterUpload = imgUrl.split("/upload/")[1];
      const publicId    = afterUpload.replace(/^v\d+\//, "").replace(/\.[^/.]+$/, "");
      await cloudinary.uploader.destroy(publicId);
    } catch (e) {
      console.log("Cloudinary delete skipped:", e.message);
    }
  }

  await product.deleteOne();
  res.json({ message: "Product deleted successfully" });
});

module.exports = {
  getProducts, getProductById, getProductsByCategory,
  createProduct, updateProduct, deleteProduct,
};
