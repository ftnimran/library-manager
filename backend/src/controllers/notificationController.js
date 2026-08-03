const Notification = require("../models/Notification");
const User = require("../models/User");

// 1. GET: Fetch Notifications & Calculate Unread based on Timestamp
exports.getNotifications = async (req, res) => {
  try {
    const target = req.user.role === "admin" ? "admin" : req.user.email;

    // Notifications fetch karo (Latest sabse upar)
    const notifications = await Notification.find({
      $or: [{ target: target }, { target: "all" }],
    }).sort({ createdAt: -1 });

    // 🚀 THE REAL FIX: Timestamp Check Logic (Industry Standard)
    const lastSeen = req.user.notificationLastSeenAt || new Date(0);

    const unreadCount = await Notification.countDocuments({
      $or: [{ target: target }, { target: "all" }],
      createdAt: { $gt: lastSeen }, // Agar notification ka time last seen se bada hai
    });

    res.json({
      success: true,
      data: notifications,
      hasUnread: unreadCount > 0, // 🔴 Red dot chalne lagega!
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. CREATE: Naya Notification Banao (Backend update ki zarurat nahi)
exports.createNotification = async (req, res) => {
  try {
    const notif = await Notification.create(req.body);
    res.status(201).json({ success: true, data: notif });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. SEEN: Jab User Bell 🔔 par click kare
exports.markAsSeen = async (req, res) => {
  try {
    // 🚀 UPDATE TIMESTAMP TO NOW
    await User.findByIdAndUpdate(
      req.user._id,
      { notificationLastSeenAt: new Date() },
      { returnDocument: "after", runValidators: true }, // Mongoose warning fix
    );

    res.json({ success: true, message: "Timestamp updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. DELETE (With Security Fix)
exports.deleteNotification = async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });

    // 🛡️ SECURITY FIX: Students "all" wali notification delete nahi kar sakte
    if (notif.target === "all" && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Aap isko delete nahi kar sakte!" });
    }

    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. CLEAR ALL
exports.clearAll = async (req, res) => {
  try {
    const target = req.user.role === "admin" ? "admin" : req.user.email;

    if (req.user.role === "admin") {
      await Notification.deleteMany({ target: { $in: ["admin", "all"] } });
    } else {
      await Notification.deleteMany({ target: target });
    }

    // Clear karne par timestamp NOW set kardo
    await User.findByIdAndUpdate(
      req.user._id,
      { notificationLastSeenAt: new Date() },
      { returnDocument: "after", runValidators: true },
    );

    res.json({ success: true, message: "All notifications cleared" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
