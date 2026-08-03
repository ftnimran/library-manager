const express = require("express");
const {
  getUsers,
  getUser, // 🚀 ADDED: Import Get User
  updateUser,
  deleteUser,
} = require("../controllers/userController");
const { protect, admin } = require("../middlewares/authMiddleware");
const router = express.Router();

router.get("/", protect, admin, getUsers);

// 🚀 FIX: `getUser` add kiya taaki student apna updated status fetch kar sake
router
  .route("/:id")
  .get(protect, getUser)
  .put(protect, updateUser)
  .delete(protect, admin, deleteUser);

module.exports = router;
