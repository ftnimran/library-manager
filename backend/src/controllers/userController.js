const User = require("../models/User");
const bcrypt = require("bcryptjs");

exports.getUsers = exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } }).select(
      "-password",
    );
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserById = exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUser = exports.updateProfile = async (req, res) => {
  try {
    const existingUser = await User.findById(req.params.id);
    if (!existingUser)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // 🚀 BUG 2 FIX: Ensure No Spaces in Updates
    if (req.body.username)
      req.body.username = req.body.username.replace(/\s/g, "").toLowerCase();
    if (req.body.email)
      req.body.email = req.body.email.replace(/\s/g, "").toLowerCase();
    if (req.body.phone) req.body.phone = req.body.phone.replace(/\s/g, "");
    if (req.body.name) req.body.name = req.body.name.trim();

    if (req.body.password) {
      const cleanPassword = req.body.password.replace(/\s/g, "");
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(cleanPassword, salt);
    }

    if (req.body.status && req.body.status !== existingUser.status) {
      req.body.deactivatedBySystem = false;
      if (req.body.status === "Active" || req.body.status === "Inactive") {
        req.body.inactiveUnlockTime = null;
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: "after",
      runValidators: true,
    }).select("-password");
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
