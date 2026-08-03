const express = require("express");
const {
  registerUser,
  loginUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
} = require("../controllers/authController");

const router = express.Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword); // 🚀 NEW
router.post("/verify-otp", verifyOtp); // 🚀 NEW
router.post("/reset-password", resetPassword); // 🚀 NEW

module.exports = router;
