const Book = require("../models/Book");

exports.getBooks = exports.getAllBooks = async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    res.json({ success: true, data: books });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBookById = exports.getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book)
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    res.json({ success: true, data: book });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBook = exports.addBook = async (req, res) => {
  try {
    // 🚀 SMART CHECK: Agar naya book ban raha hai aur frontend ne available nahi bheja,
    // to available ko total quantity ke barabar set kardo.
    if (req.body.quantity !== undefined && req.body.available === undefined) {
      req.body.available = req.body.quantity;
    }
    const book = await Book.create(req.body);
    res.status(201).json({ success: true, data: book });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBook = async (req, res) => {
  try {
    // 🚀 BUG 2 FIX: Database se purani book nikalo aur maths lagao
    const existingBook = await Book.findById(req.params.id);
    if (!existingBook)
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });

    // Agar User/Admin 'quantity' (Total) update kar raha hai
    if (req.body.quantity !== undefined) {
      // Diff = Nayi Quantity - Purani Quantity
      const diff = req.body.quantity - existingBook.quantity;

      // Nayi available count = Purani Available + Diff (e.g. 5 badhi to 5 available me jud jayegi)
      req.body.available = existingBook.available + diff;

      // Negative validation (taaki error na aaye)
      if (req.body.available < 0) req.body.available = 0;
    }

    const book = await Book.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: "after",
      runValidators: true,
    });
    if (!book)
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    res.json({ success: true, data: book });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book)
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    res.json({ success: true, message: "Book deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
