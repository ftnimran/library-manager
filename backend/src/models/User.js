const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "student"], default: "student" },
    avatar: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Deactivate"],
      default: "Active",
    },

    lastLogin: { type: Date, default: Date.now },
    inactiveUnlockTime: { type: Date, default: null },
    notificationLastSeenAt: { type: Date, default: null },
    deactivatedBySystem: { type: Boolean, default: false },

    // Forgot Password Fields
    resetPasswordOtp: { type: String, default: null },
    resetPasswordExpire: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// 🚀 CRITICAL BUG FIX: Async functions me 'next' ki zaroorat nahi hoti Mongoose me.
// Isi ki wajah se "next is not a function" error aa raha tha.
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return; // Natively return from async function
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
