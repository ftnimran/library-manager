import { useState, useEffect } from "react";
import { useLibrary } from "../../context/LibraryContext";
import { useNavigate, useParams, Link } from "react-router-dom";
import { PREDEFINED_CATEGORIES } from "../../constants/books";

export default function EditBook() {
  const { books, updateBook, user, showAlert } = useLibrary();
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // 🚀 LOADER STATE
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const targetBook = books.find((b) => b.id === id);
    if (targetBook) {
      setFormData(targetBook);
      if (!PREDEFINED_CATEGORIES.includes(targetBook.category))
        setIsCustomCategory(true);
    } else {
      showAlert("Book not found!", "Error", "error");
      navigate("/books");
    }
  }, [id, books, navigate, showAlert]);

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-20 animate-fade-in bg-bg-white rounded-2xl shadow-sm border border-border-color">
        <i className="fas fa-lock text-5xl text-danger mb-4 opacity-80"></i>
        <h2 className="text-3xl font-bold text-text-dark">Access Denied</h2>
        <p className="text-text-muted mt-2 mb-8">
          Only administrators have permission to edit library books.
        </p>
        <Link
          to="/books"
          className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#5b54e0] transition-colors inline-block"
        >
          Go Back to Books
        </Link>
      </div>
    );
  }

  if (!formData)
    return (
      <div className="text-center py-10 text-text-muted font-medium">
        Loading...
      </div>
    );

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size < 2 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onloadend = () =>
        setFormData((prev) => ({ ...prev, cover: reader.result }));
      reader.readAsDataURL(file);
    } else if (file) {
      showAlert(
        "Image size should be less than 2MB",
        "File Too Large",
        "error",
      );
    }
  };

  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== "application/pdf") {
        showAlert("Please select a PDF file.", "Invalid Format", "error");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showAlert(
          "PDF size should be less than 10MB.",
          "File Too Large",
          "error",
        );
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () =>
        setFormData((prev) => ({ ...prev, pdf: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true); // 🚀 START LOADER
    const qtyDiff = parseInt(formData.quantity) - formData.quantity;
    const updatedData = {
      title: formData.title,
      author: formData.author,
      category: formData.category.trim(),
      isbn: formData.isbn,
      quantity: parseInt(formData.quantity),
      available: Math.max(0, formData.available + qtyDiff),
      description: formData.description,
      cover: formData.cover,
      pdf: formData.pdf,
    };

    const success = await updateBook(id, updatedData);
    setIsSubmitting(false); // 🚀 STOP LOADER

    if (success) {
      showAlert("Book updated successfully!", "Success", "success");
      navigate("/books");
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6 text-text-muted">
        <Link
          to="/books"
          className="hover:text-primary transition-colors flex items-center gap-2"
        >
          <i className="fas fa-arrow-left"></i>{" "}
          <span className="font-medium">Back to Books</span>
        </Link>
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-dark">Edit Book Details</h1>
        <p className="text-text-muted mt-1">
          Modify the required fields for the selected book.
        </p>
      </div>
      <div className="bg-bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-border-color">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1.5">
                Book Title
              </label>
              <input
                type="text"
                id="title"
                className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1.5">
                Author Name
              </label>
              <input
                type="text"
                id="author"
                className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
                value={formData.author}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1.5">
                Category
              </label>
              {isCustomCategory ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    id="category"
                    className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
                    value={formData.category}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(false);
                      setFormData((p) => ({ ...p, category: "Fiction" }));
                    }}
                    className="w-12 h-12 flex-shrink-0 flex justify-center items-center border border-border-color rounded-lg bg-bg-light text-text-muted hover:bg-danger/10 hover:text-danger hover:border-danger transition-all cursor-pointer"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ) : (
                <select
                  id="category"
                  className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark cursor-pointer"
                  value={formData.category}
                  onChange={(e) => {
                    if (e.target.value === "Other") {
                      setIsCustomCategory(true);
                      setFormData((p) => ({ ...p, category: "" }));
                    } else handleChange(e);
                  }}
                  required
                >
                  {PREDEFINED_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="Other" className="font-bold text-primary">
                    Other (Type custom)...
                  </option>
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1.5">
                ISBN
              </label>
              <input
                type="text"
                id="isbn"
                className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
                value={formData.isbn}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1.5">
                Quantity
              </label>
              <input
                type="number"
                id="quantity"
                min="1"
                className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
                value={formData.quantity}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Book Cover Image
              </label>
              <div className="flex items-center gap-4 bg-bg-light p-3 rounded-lg border border-border-color">
                <div className="w-16 h-24 rounded border-2 border-primary/30 flex items-center justify-center bg-bg-white flex-shrink-0 overflow-hidden shadow-inner">
                  {formData.cover && !formData.cover.includes("placeholder") ? (
                    <img
                      src={formData.cover}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <i className="fa-solid fa-image text-text-muted text-2xl"></i>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-xs text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Book PDF File{" "}
                <span className="text-primary text-xs ml-1">(Max 10MB)</span>
              </label>
              <div className="flex items-center gap-4 bg-bg-light p-3 rounded-lg border border-border-color h-[122px]">
                <div className="w-16 h-16 rounded-full border-2 border-primary/30 flex items-center justify-center bg-bg-white text-danger flex-shrink-0 shadow-inner">
                  {formData.pdf ? (
                    <i className="fa-solid fa-check-circle text-success text-3xl"></i>
                  ) : (
                    <i className="fa-solid fa-file-pdf text-3xl"></i>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfChange}
                    className="block w-full text-xs text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-danger/10 file:text-danger hover:file:bg-danger/20 file:cursor-pointer transition-all"
                  />
                  {formData.pdf && (
                    <p className="text-[10px] text-success font-bold mt-2">
                      PDF uploaded
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1.5">
              Description (Optional)
            </label>
            <textarea
              id="description"
              rows="3"
              className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
              value={formData.description}
              onChange={handleChange}
            ></textarea>
          </div>
          <div className="flex justify-end gap-4 border-t border-border-color pt-6">
            <Link
              to="/books"
              className="px-5 py-2.5 rounded-lg font-medium text-text-muted hover:bg-bg-light border border-border-color transition-all cursor-pointer"
            >
              Cancel
            </Link>

            {/* 🚀 BUTTON LOADER UPDATE */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`bg-primary text-white px-6 py-2.5 rounded-lg font-medium shadow-md transition-all flex items-center justify-center gap-2 ${isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:bg-[#5b54e0] cursor-pointer"}`}
            >
              {isSubmitting ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-save"></i>
              )}{" "}
              {isSubmitting ? "Updating..." : "Update Book"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
