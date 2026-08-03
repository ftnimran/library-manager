const express = require("express");
const {
  getNotifications,
  createNotification,
  deleteNotification,
  clearAll,
  markAsSeen,
} = require("../controllers/notificationController");
const { protect } = require("../middlewares/authMiddleware");
const router = express.Router();

router
  .route("/")
  .get(protect, getNotifications)
  .post(protect, createNotification);

router.post("/mark-seen", protect, markAsSeen); // Update DB to False
router.delete("/clear-all", protect, clearAll); // Delete & Update DB to False
router.delete("/:id", protect, deleteNotification);

module.exports = router;
