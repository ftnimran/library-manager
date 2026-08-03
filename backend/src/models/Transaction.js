const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Dates
    issueDate: { type: Date, default: Date.now },
    returnDate: { type: Date },

    status: {
      type: String,
      enum: ["Pending", "Issued", "Returned", "Rejected"],
      default: "Pending",
    },

    // 🚀 NEW FIX: Daily reminder aur overdue ko track karne ke liye
    lastReminderDate: { type: String, default: null },
    overdueNotified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Transaction", transactionSchema);
