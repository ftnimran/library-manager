const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    category: { type: String, required: true },
    isbn: { type: String, required: true, unique: true },
    quantity: { type: Number, required: true, min: 1 },
    available: { type: Number, required: true, min: 0 },
    description: { type: String },
    cover: { type: String }, // Base64 or Cloudinary URL
    pdf: { type: String }, // Base64 or Cloudinary URL
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

module.exports = mongoose.model("Book", bookSchema);
