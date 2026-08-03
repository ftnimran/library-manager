const Transaction = require("../models/Transaction");
const Book = require("../models/Book");
const User = require("../models/User");

exports.getTransactions = exports.getAllTransactions = async (req, res) => {
  try {
    const query = req.user.role === "admin" ? {} : { userId: req.user._id };
    const transactions = await Transaction.find(query)
      .populate("bookId", "title author coverImage")
      .populate("userId", "name email")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createTransaction = exports.addTransaction = async (req, res) => {
  try {
    if (!req.body.userId && req.user) req.body.userId = req.user._id;

    let finalStatus =
      req.body.status || (req.user.role === "admin" ? "Issued" : "Pending");
    req.body.status = finalStatus;
    req.body.issueDate = new Date();

    if (req.body.returnDate) {
      req.body.returnDate = new Date(req.body.returnDate);
    } else if (finalStatus === "Issued") {
      const returnDate = new Date();
      returnDate.setDate(returnDate.getDate() + 25);
      req.body.returnDate = returnDate;
    }

    const transaction = await Transaction.create(req.body);

    if (finalStatus === "Issued") {
      const book = await Book.findById(transaction.bookId);
      if (book && book.available > 0) {
        book.available = book.available - 1;
        await book.save();
      }
    }
    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStatus = exports.updateTxStatus = async (req, res) => {
  try {
    const { status, returnDate: customReturnDate } = req.body;
    let updateData = { status };

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });

    if (status === "Issued" && transaction.status === "Pending") {
      updateData.issueDate = new Date();

      if (customReturnDate) {
        updateData.returnDate = new Date(customReturnDate);
      } else if (!transaction.returnDate) {
        const rDate = new Date();
        rDate.setDate(rDate.getDate() + 25);
        updateData.returnDate = rDate;
      }
    }

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      updateData,
      { returnDocument: "after", runValidators: true },
    );

    if (status === "Issued" || status === "Returned") {
      const book = await Book.findById(updatedTransaction.bookId);
      if (book) {
        book.available =
          status === "Issued" ? book.available - 1 : book.available + 1;
        await book.save();
      }

      // 🚀 Fix: Only reactivate if deactivated BY SYSTEM (not by Admin)
      if (status === "Returned") {
        const user = await User.findById(updatedTransaction.userId);
        if (user && user.status === "Deactivate" && user.deactivatedBySystem) {
          const allIssued = await Transaction.find({
            userId: user._id,
            status: "Issued",
          });
          let hasOverdue = false;

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          for (let tx of allIssued) {
            const rD = new Date(tx.returnDate);
            rD.setHours(0, 0, 0, 0);
            // 🚀 Fix: <= 0 checks for overdue correctly
            if (rD.getTime() - today.getTime() <= 0) {
              hasOverdue = true;
              break;
            }
          }
          if (!hasOverdue) {
            user.status = "Active";
            user.deactivatedBySystem = false;
            await user.save();
          }
        }
      }
    }

    res.json({ success: true, data: updatedTransaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    if (!transaction)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    res.json({ success: true, message: "Transaction deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
