const express = require("express");
const router  = express.Router();
const { getDashboardStats } = require("../controllers/dashboardController");
const { adminProtect } = require("../middleware/auth");

router.get("/stats", adminProtect, getDashboardStats);

module.exports = router;
