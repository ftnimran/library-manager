const express = require("express");
const authRoutes = require("./authRoutes");
const bookRoutes = require("./bookRoutes");
const userRoutes = require("./userRoutes");
const transactionRoutes = require("./transactionRoutes");
const notificationRoutes = require("./notificationRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/books", bookRoutes);
router.use("/users", userRoutes);
router.use("/transactions", transactionRoutes);
router.use("/notifications", notificationRoutes); 

module.exports = router;
