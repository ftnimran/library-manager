const User = require("../models/User");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

exports.registerUser = async (req, res) => {
  let { name, username, email, phone, password } = req.body;
  try {
    name = name?.trim();
    username = username?.replace(/\s/g, "").toLowerCase();
    email = email?.replace(/\s/g, "").toLowerCase();
    phone = phone?.replace(/\s/g, "");
    password = password?.replace(/\s/g, "");

    if (!name || !username || !email || !phone || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required!" });
    }
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Email or Username is already taken!",
        });
    }

    const user = await User.create({
      name,
      username,
      email,
      phone,
      password,
      role: "student",
      status: "Active",
    });

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        status: user.status,
        lastSeenNotificationId: user.lastSeenNotificationId,
        deactivatedBySystem: user.deactivatedBySystem,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error: " + error.message });
  }
};

exports.loginUser = async (req, res) => {
  let { identifier, password } = req.body;
  try {
    identifier = identifier?.replace(/\s/g, "").toLowerCase();
    password = password?.replace(/\s/g, "");

    if (!identifier || !password)
      return res
        .status(400)
        .json({
          success: false,
          message: "Please provide both Email/Username and Password!",
        });

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (user && (await user.matchPassword(password))) {
      const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;
      const timeSinceLastLogin =
        Date.now() - new Date(user.lastLogin).getTime();

      if (
        user.role !== "admin" &&
        user.status === "Active" &&
        timeSinceLastLogin > FIFTEEN_DAYS
      ) {
        user.status = "Inactive";
        user.inactiveUnlockTime = null;
        await user.save();
      }

      if (user.status === "Inactive") {
        if (!user.inactiveUnlockTime) {
          user.inactiveUnlockTime = new Date(Date.now() + 15 * 60 * 1000);
          await user.save();
          return res
            .status(403)
            .json({
              success: false,
              message: `Your account is Inactive. Please wait 15 minutes, it will auto-activate.`,
            });
        } else if (new Date() < user.inactiveUnlockTime) {
          const diffMins = Math.ceil(
            (user.inactiveUnlockTime - new Date()) / 60000,
          );
          return res
            .status(403)
            .json({
              success: false,
              message: `Account is Inactive. Please wait ${diffMins} more minutes.`,
            });
        } else {
          user.status = "Active";
          user.inactiveUnlockTime = null;
        }
      }

      user.lastLogin = Date.now();
      await user.save();

      res.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          status: user.status,
          lastSeenNotificationId: user.lastSeenNotificationId,
          deactivatedBySystem: user.deactivatedBySystem,
        },
        token: generateToken(user._id),
      });
    } else {
      res
        .status(401)
        .json({
          success: false,
          message: "Invalid Email/Username or Password.",
        });
    }
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error: " + error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const email = req.body.email?.replace(/\s/g, "").toLowerCase();
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "No account found with this email!" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOtp = otp;

    // 🚀 BUG FIX: Added Network Latency Buffer. Backend is now 90 seconds (1.5 mins), Frontend is strictly 1 minute (60s).
    user.resetPasswordExpire = Date.now() + 90 * 1000;
    await user.save({ validateBeforeSave: false });

    const htmlMessage = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; border: 1px solid #eaeaec; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="text-align: center; border-bottom: 2px solid #f0f0f5; padding-bottom: 20px; margin-bottom: 25px;">
          <h2 style="color: #6C63FF; margin: 0; font-size: 28px; letter-spacing: 1px;">LibMaster</h2>
          <p style="color: #888; font-size: 14px; margin-top: 5px; text-transform: uppercase; letter-spacing: 2px;">Library Management System</p>
        </div>
        
        <div style="color: #444; font-size: 16px; line-height: 1.6;">
          <p style="font-size: 18px; font-weight: bold; color: #333;">Hello ${user.name},</p>
          <p>We received a request to reset the password for your LibMaster account.</p>
          <p>Please use the following One-Time Password (OTP) to proceed. For your security, this code will expire in <strong style="color: #e74c3c;">1 minute</strong>.</p>
          
          <div style="text-align: center; margin: 35px 0;">
            <span style="display: inline-block; background-color: #f8f8ff; border: 2px dashed #6C63FF; color: #6C63FF; font-size: 36px; font-weight: bold; letter-spacing: 12px; padding: 15px 30px; border-radius: 8px; font-family: 'Courier New', Courier, monospace; box-shadow: 0 2px 5px rgba(108, 99, 255, 0.1);">
              ${otp}
            </span>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 10px;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        </div>
        
        <div style="margin-top: 35px; padding-top: 20px; border-top: 1px solid #f0f0f5; text-align: center; color: #aaa; font-size: 12px; line-height: 1.5;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} LibMaster. All rights reserved.</p>
          <p style="margin: 5px 0 0 0;">This is an automated security message, please do not reply.</p>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: "LibMaster - Password Reset OTP",
        html: htmlMessage,
      });
      return res.json({
        success: true,
        message: "OTP has been sent to your email!",
      });
    } catch (err) {
      console.error("❌ Email Sending Failed:", err);
      user.resetPasswordOtp = null;
      user.resetPasswordExpire = null;
      await user.save({ validateBeforeSave: false });
      return res
        .status(500)
        .json({
          success: false,
          message: "Error sending email: " + (err.message || "Timeout"),
        });
    }
  } catch (error) {
    console.error("❌ Server Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error: " + error.message });
  }
};

exports.verifyOtp = async (req, res) => {
  const email = req.body.email?.replace(/\s/g, "").toLowerCase();
  const otp = req.body.otp?.replace(/\s/g, "");

  try {
    const user = await User.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP or OTP has expired!" });

    // Success hone par Next Step (Password reset) ke liye 5 minute do
    user.resetPasswordExpire = Date.now() + 5 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: "OTP verified successfully!" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error: " + error.message });
  }
};

exports.resetPassword = async (req, res) => {
  const email = req.body.email?.replace(/\s/g, "").toLowerCase();
  const otp = req.body.otp?.replace(/\s/g, "");
  const password = req.body.password?.replace(/\s/g, "");

  try {
    const user = await User.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user)
      return res
        .status(400)
        .json({
          success: false,
          message: "Session expired. Please request a new OTP.",
        });

    user.password = password;
    user.resetPasswordOtp = null;
    user.resetPasswordExpire = null;
    await user.save();

    res.json({
      success: true,
      message:
        "Your password has been successfully changed! You can now login.",
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error: " + error.message });
  }
};
