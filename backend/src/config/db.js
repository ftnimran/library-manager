const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      tls: true,
      serverSelectionTimeoutMS: 10000, // 10 sec timeout instead of crashing immediately
    });

    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Process exit nahi karenge taaki server crash-loop me na fase
  }
};

module.exports = connectDB;
