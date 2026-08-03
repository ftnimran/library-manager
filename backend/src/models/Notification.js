const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    desc: { type: String, required: true },
    type: { type: String, default: "primary" },
    icon: { type: String, default: "fa-bell" },
    target: { type: String, required: true },
    // Mongoose will automatically add "createdAt" and "updatedAt"
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notification", notificationSchema);
