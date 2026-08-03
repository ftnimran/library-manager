const express = require("express");
const {
  getTransactions,
  createTransaction,
  updateStatus,
} = require("../controllers/transactionController");
const { protect, admin } = require("../middlewares/authMiddleware");
const router = express.Router();

router
  .route("/")
  .get(protect, getTransactions)
  .post(protect, createTransaction);
router.put("/:id/status", protect, updateStatus); // Admin returns/accepts, or User returns

module.exports = router;
