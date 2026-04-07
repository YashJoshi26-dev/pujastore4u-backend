const express = require("express");
const router  = express.Router();
const {
  getProducts, getProductById, getProductsByCategory,
  createProduct, updateProduct, deleteProduct,
} = require("../controllers/productController");
const { adminProtect } = require("../middleware/auth");
const { upload }       = require("../config/cloudinary");

// Public routes
router.get("/",                    getProducts);
router.get("/category/:name",      getProductsByCategory);
router.get("/:id",                 getProductById);

// Admin only routes
router.post(  "/",   adminProtect, upload.array("images", 6), createProduct);
router.put(   "/:id",adminProtect, upload.array("images", 6), updateProduct);
router.delete("/:id",adminProtect,                            deleteProduct);

module.exports = router;