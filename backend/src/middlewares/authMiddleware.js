const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user)
        return res
          .status(401)
          .json({ success: false, message: "User not found" });

      // 🛑 INACTIVE CHECK: Agar status Inactive hai toh API turant block karega (Auto Logout ke liye)
      if (req.user.status === "Inactive") {
        return res.status(403).json({
          success: false,
          message: "Account is inactive",
          isInactive: true,
        });
      }

      // 🚀 TRACK 15 DAYS VISIT: Agar student ne 24 ghante baad visit kiya hai toh Date update karo
      if (req.user.role === "student") {
        const now = new Date();
        const lastLoginDate = new Date(req.user.lastLogin || 0);
        if (now - lastLoginDate > 24 * 60 * 60 * 1000) {
          req.user.lastLogin = now;
          await req.user.save();
        }
      }

      next();
    } catch (error) {
      res
        .status(401)
        .json({ success: false, message: "Not authorized, token failed" });
    }
  } else {
    res
      .status(401)
      .json({ success: false, message: "Not authorized, no token" });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res
      .status(403)
      .json({ success: false, message: "Not authorized as an admin" });
  }
};

module.exports = { protect, admin };
