// routes/aiRoutes.js
const express = require("express");
const router  = express.Router();
const { generateProductDetails } = require("../controllers/aiController");

router.post("/generate", generateProductDetails);

module.exports = router;