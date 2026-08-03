require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");
const User = require("./models/User");
const Transaction = require("./models/Transaction");
const Notification = require("./models/Notification");
const cron = require("node-cron");

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE", "PATCH"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);
  socket.on("disconnect", () =>
    console.log(`❌ Client disconnected: ${socket.id}`),
  );
});

// 🚀 CRON JOB: Har Minute chalega (Fix for Indian Timezone)
cron.schedule("* * * * *", async () => {
  try {
    // 🚀 BUG 2 FIX: Ensure exact Indian Standard Time (IST) for Rollover
    const now = new Date();
    const istTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    );

    const year = istTime.getFullYear();
    const month = String(istTime.getMonth() + 1).padStart(2, "0");
    const day = String(istTime.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`; // String in YYYY-MM-DD

    const todayD = new Date(todayStr); // Local Midnight UTC Reference
    let hasChanges = false;

    // 🛑 1. CHECK 15 DAYS INACTIVITY
    const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - FIFTEEN_DAYS);
    const inactiveStudents = await User.find({
      role: "student",
      status: "Active",
      lastLogin: { $lt: cutoffDate },
    });

    for (let student of inactiveStudents) {
      student.status = "Inactive";
      student.inactiveUnlockTime = null;
      await student.save();
      hasChanges = true;
    }

    // 🛑 2. CHECK OVERDUE & REMINDERS
    const activeIssues = await Transaction.find({ status: "Issued" })
      .populate("userId")
      .populate("bookId");

    for (let issue of activeIssues) {
      if (!issue.userId || !issue.bookId || !issue.returnDate) continue;

      const returnDateStr = issue.returnDate.toISOString().split("T")[0];
      const returnD = new Date(returnDateStr);

      const diffTime = returnD.getTime() - todayD.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const txIdShort = issue._id.toString().slice(-6).toLowerCase();

      // SCENARIO 1: OVERDUE
      if (diffDays <= 0) {
        if (issue.userId.status !== "Deactivate") {
          await User.findByIdAndUpdate(issue.userId._id, {
            status: "Deactivate",
            deactivatedBySystem: true,
          });
          hasChanges = true;
        }

        if (!issue.overdueNotified) {
          await Notification.create({
            title: "Book Overdue! Account Deactivated",
            desc: `Please return "${issue.bookId.title}" (Tx ID: #${txIdShort}) immediately to reactivate account.`,
            type: "danger",
            icon: "fa-ban",
            target: issue.userId.email,
          });
          await Notification.create({
            title: "Student Overdue",
            desc: `${issue.userId.name}'s account deactivated for overdue book "${issue.bookId.title}" (Tx ID: #${txIdShort}).`,
            type: "danger",
            icon: "fa-ban",
            target: "admin",
          });
          issue.overdueNotified = true;
          await issue.save();
          hasChanges = true;
        }
      }
      // SCENARIO 2: DAILY REMINDER
      else if (diffDays <= 5 && diffDays >= 1) {
        if (issue.lastReminderDate !== todayStr) {
          const dueText = `in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
          await Notification.create({
            title: "Reminder: Return Date Approaching",
            desc: `"${issue.bookId.title}" (Tx ID: #${txIdShort}) is due ${dueText}.`,
            type: "warning",
            icon: "fa-clock",
            target: issue.userId.email,
          });
          issue.lastReminderDate = todayStr;
          await issue.save();
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      io.emit("db_updated");
    }
  } catch (error) {
    console.error("Cron Error:", error);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running with WebSockets on port ${PORT}`);
});

connectDB().then(async () => {
  try {
    const adminExists = await User.findOne({ role: "admin" });
    if (!adminExists) {
      // 🚀 STRICT SECURITY CHECK: Stop execution if credentials are missing
      if (
        !process.env.ADMIN_EMAIL ||
        !process.env.ADMIN_PHONE ||
        !process.env.ADMIN_USERNAME ||
        !process.env.ADMIN_PASSWORD
      ) {
        console.warn(
          "⚠️ Security Warning: Admin credentials missing in .env! Default admin account will NOT be created.",
        );
        return;
      }
      await User.create({
        name: process.env.ADMIN_NAME || "System Admin",
        username: process.env.ADMIN_USERNAME,
        email: process.env.ADMIN_EMAIL,
        phone: process.env.ADMIN_PHONE,
        password: process.env.ADMIN_PASSWORD,
        role: "admin",
        status: "Active",
      });
      console.log(
        "✅ Secure Admin account created successfully from .env variables!",
      );
    }
  } catch (err) {
    // 🚀 PRO-TIP: Ignore duplicate key error in case of parallel server startups
    if (err.code === 11000) {
      console.log("✅ Admin account was already created by another instance.");
    } else {
      console.error("❌ Error creating admin account:", err.message);
    }
  }
});
