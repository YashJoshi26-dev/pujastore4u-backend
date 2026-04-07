const asyncHandler = require("express-async-handler");
const Product      = require("../models/Product");
const { cloudinary } = require("../config/cloudinary");

// ─── Helper: upload one buffer to Cloudinary ─────────────────────────────────
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

// ─── Helper: upload all req.files → returns array of secure_urls ─────────────
const uploadAllFiles = async (files) => {
  if (!files || files.length === 0) return [];
  const urls = [];
  for (const file of files) {
    try {
      const result = await uploadBufferToCloudinary(file.buffer);
      urls.push(result.secure_url);
    } catch (err) {
      console.error("Upload failed for", file.originalname, "—", err.message);
      // never push null — just skip this file
    }
  }
  return urls;
};

// ─── GET /api/products ────────────────────────────────────────────────────────
const getProducts = asyncHandler(async (req, res) => {
  const { category, brand, minPrice, maxPrice, rating, inStock, search, sort, status } = req.query;

  const query = status === "all" ? {} : { status: "active" };

  if (category) query.category = category;
  if (brand)    query.brand    = brand;
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
const getProductsByCategory = asyncHandler(async (req, res) => {
  const products = await Product.find({
    category: { $regex: new RegExp(req.params.name, "i") },
    status: "active",
  }).sort({ createdAt: -1 });
  res.json(products);
});

// ─── POST /api/products ───────────────────────────────────────────────────────
const createProduct = asyncHandler(async (req, res) => {
  const { title, description, category, brand, stock, sku, tags, status, specifications } = req.body;

  // Frontend may send price as duplicate key in FormData
  let price    = req.body.price;
  let oldPrice = req.body.oldPrice;
  if (Array.isArray(price)) { oldPrice = price[0]; price = price[1]; }

  const priceNum    = Number(price);
  const oldPriceNum = oldPrice ? Number(oldPrice) : null;

  if (!title || !category)              return res.status(400).json({ message: "Title and category are required" });
  if (isNaN(priceNum) || priceNum <= 0) return res.status(400).json({ message: "Please enter a valid price" });
  if (!stock || isNaN(Number(stock)))   return res.status(400).json({ message: "Please enter a valid stock quantity" });

  // ✅ KEY FIX: upload buffer via stream — f.path is undefined with memoryStorage
  const images = await uploadAllFiles(req.files);

  const product = await Product.create({
    title,
    description:    description    || "",
    category,
    brand:          brand          || "Custom",
    price:          priceNum,
    oldPrice:       oldPriceNum,
    stock:          Number(stock),
    sku:            sku            || "",
    tags:           tags           ? JSON.parse(tags)           : [],
    status:         status         || "active",
    images,
    image:          images[0]      || "",
    specifications: specifications ? JSON.parse(specifications) : {},
  });

  res.status(201).json(product);
});

// ─── PUT /api/products/:id ────────────────────────────────────────────────────
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  const updates = { ...req.body };

  if (req.files?.length > 0) {
    // ✅ FIX: use buffer upload, filter existing nulls
    const newImages  = await uploadAllFiles(req.files);
    const existing   = (product.images || []).filter(Boolean);
    updates.images   = [...existing, ...newImages];
    updates.image    = updates.images[0] || "";
  }

  if (updates.tags)           updates.tags           = JSON.parse(updates.tags);
  if (updates.specifications) updates.specifications = JSON.parse(updates.specifications);
  if (updates.price)          updates.price          = Number(updates.price);
  if (updates.oldPrice)       updates.oldPrice       = Number(updates.oldPrice);
  if (updates.stock)          updates.stock          = Number(updates.stock);

  const updated = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  res.json(updated);
});

// ─── DELETE /api/products/:id ─────────────────────────────────────────────────
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  // ✅ FIX: filter nulls before Cloudinary delete + correct public_id extraction
  for (const imgUrl of (product.images || []).filter(Boolean)) {
    try {
      const afterUpload = imgUrl.split("/upload/")[1];          // v123/folder/file.jpg
      const publicId    = afterUpload
        .replace(/^v\d+\//, "")    // strip version
        .replace(/\.[^/.]+$/, ""); // strip extension
      await cloudinary.uploader.destroy(publicId);
    } catch (e) {
      console.log("Cloudinary delete skipped:", e.message);
    }
  }

  await product.deleteOne();
  res.json({ message: "Product deleted successfully" });
});

module.exports = { getProducts, getProductById, getProductsByCategory, createProduct, updateProduct, deleteProduct };