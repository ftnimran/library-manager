const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const routes = require("./routes");

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());
app.use(morgan("dev"));

// 🚀 REAL-TIME SOCKET EMITTER (Live Sync Logic)
app.use((req, res, next) => {
  res.on("finish", () => {
    const isMutatingMethod = ["POST", "PUT", "DELETE", "PATCH"].includes(
      req.method,
    );
    const isSuccessStatus = res.statusCode >= 200 && res.statusCode < 300;

    const ignoredRoutes = ["/login", "/mark-seen", "/sync-status"];
    const isIgnored = ignoredRoutes.some((route) =>
      req.originalUrl.includes(route),
    );

    if (isMutatingMethod && isSuccessStatus && !isIgnored) {
      const io = req.app.get("io");
      if (io) {
        console.log(
          `📢 Broadcasting DB Update to all live users (Triggered by: ${req.originalUrl})`,
        );
        io.emit("db_updated");
      }
    }
  });
  next();
});

app.use("/api/v1", routes);

app.get("/", (req, res) => {
  res.send("LibMaster API is running...");
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

module.exports = app;
