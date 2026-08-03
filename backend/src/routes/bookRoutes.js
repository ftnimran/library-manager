const express = require("express");
const {
  getBooks,
  addBook,
  updateBook,
  deleteBook,
} = require("../controllers/bookController");
const { protect, admin } = require("../middlewares/authMiddleware");
const router = express.Router();

router.route("/").get(protect, getBooks).post(protect, admin, addBook);
router
  .route("/:id")
  .put(protect, admin, updateBook)
  .delete(protect, admin, deleteBook);

module.exports = router;
