import { useState, useEffect } from "react";
import { useLibrary } from "../../context/LibraryContext";
import { useSearchParams, Link } from "react-router-dom";

export default function Books() {
  const { books, deleteBook, user, members, issued, showAlert, showConfirm } =
    useLibrary();
  const [searchParams] = useSearchParams();
  const isAdmin = user?.role === "admin";

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");

  const currentMember = members.find((m) => m.email === user?.email);

  useEffect(() => {
    const query = searchParams.get("search");
    if (query) setSearch(query);
  }, [searchParams]);

  const handleDelete = (id) => {
    if (!isAdmin) {
      showAlert("Only admins can delete books.", "Access Denied", "error");
      return;
    }
    showConfirm(
      "Are you sure you want to delete this book?",
      async () => {
        await deleteBook(id);
      },
      "Delete Book",
    );
  };

  let processedBooks = books.filter((b) => {
    const matchSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase()) ||
      b.isbn.includes(search);
    const matchCategory = b.category
      .toLowerCase()
      .includes(category.toLowerCase());
    return matchSearch && matchCategory;
  });

  if (sort === "az")
    processedBooks.sort((a, b) => a.title.localeCompare(b.title));
  else if (sort === "za")
    processedBooks.sort((a, b) => b.title.localeCompare(a.title));
  else if (sort === "newest") processedBooks = [...processedBooks].reverse();

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-dark">Books Directory</h1>
          <p className="text-text-muted mt-1">Manage your library collection</p>
        </div>
        {isAdmin && (
          <Link
            to="/add-book"
            className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#5b54e0] shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <i className="fas fa-plus"></i> Add New Book
          </Link>
        )}
      </div>

      <div className="bg-bg-white p-5 rounded-2xl shadow-sm border border-border-color mb-8 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"></i>
          <input
            type="text"
            placeholder="Search title, author, ISBN..."
            className="w-full pl-11 pr-4 p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Filter by Category"
            className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div className="min-w-[150px]">
          <select
            className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark cursor-pointer"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="az">Title (A-Z)</option>
            <option value="za">Title (Z-A)</option>
          </select>
        </div>
      </div>

      {processedBooks.length === 0 ? (
        <div className="text-center py-16 bg-bg-white rounded-2xl border border-border-color shadow-sm">
          <i className="fas fa-book-open text-5xl text-text-muted mb-4 opacity-50"></i>
          <h3 className="text-xl font-bold text-text-dark">No books found</h3>
          <p className="text-text-muted mt-2">
            Try adjusting your search or add a new book.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {processedBooks.map((book) => {
            let isAlreadyIssued = false;
            let isPending = false;

            if (!isAdmin && currentMember) {
              isAlreadyIssued = issued.some(
                (tx) =>
                  tx.bookId === book.id &&
                  tx.memberId === currentMember.id &&
                  tx.status === "Issued",
              );
              isPending = issued.some(
                (tx) =>
                  tx.bookId === book.id &&
                  tx.memberId === currentMember.id &&
                  tx.status === "Pending",
              );
            }

            return (
              <div
                key={book.id}
                className="bg-bg-white rounded-2xl shadow-sm border border-border-color overflow-hidden hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col group"
              >
                <div className="h-56 bg-gray-100 relative overflow-hidden">
                  <span
                    className={`absolute top-3 right-3 px-3 py-1 text-xs font-bold rounded-full z-10 backdrop-blur-sm shadow-sm ${book.available > 0 ? "bg-success/90 text-white" : "bg-danger/90 text-white"}`}
                  >
                    {book.available > 0 ? "Available" : "Out of Stock"}
                  </span>
                  <img
                    src={
                      book.cover ||
                      "https://via.placeholder.com/200x300?text=No+Cover"
                    }
                    alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-lg text-text-dark line-clamp-2 leading-tight mb-1">
                    {book.title}
                  </h3>
                  <p className="text-text-muted text-sm mb-3">
                    by {book.author}
                  </p>
                  <div className="mb-4">
                    <span className="inline-block bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
                      {book.category}
                    </span>
                  </div>
                  <div className="mt-auto flex justify-between items-center text-sm text-text-muted border-t border-border-color pt-4 mb-4">
                    <span className="flex items-center gap-1 font-medium">
                      <i className="fas fa-layer-group"></i> {book.available} /{" "}
                      {book.quantity}
                    </span>
                    <span className="text-xs">ISBN: {book.isbn}</span>
                  </div>

                  <div className="flex gap-2">
                    {isPending ? (
                      <button
                        disabled
                        className="flex-1 bg-warning/20 text-warning border border-warning/30 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold cursor-not-allowed"
                      >
                        <i className="fas fa-clock mr-2"></i> Pending
                      </button>
                    ) : isAlreadyIssued ? (
                      <button
                        disabled
                        className="flex-1 bg-bg-light text-text-muted border border-border-color flex items-center justify-center py-2.5 rounded-lg text-sm font-bold cursor-not-allowed"
                      >
                        <i className="fas fa-check-circle mr-2"></i> Issued
                      </button>
                    ) : (
                      <Link
                        to={
                          currentMember?.status === "Deactivate"
                            ? "#"
                            : `/issued?bookId=${book.id}`
                        }
                        onClick={(e) => {
                          if (currentMember?.status === "Deactivate") {
                            e.preventDefault();
                            showAlert(
                              "Your account is deactivated. You cannot request new books.",
                              "Account Restricted",
                              "error",
                            );
                          }
                        }}
                        className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm ${book.available > 0 && currentMember?.status !== "Deactivate" ? "bg-secondary hover:bg-[#00a38d] text-white cursor-pointer" : "bg-bg-light text-text-muted border border-border-color cursor-not-allowed pointer-events-none"}`}
                      >
                        {book.available > 0
                          ? currentMember?.status === "Deactivate"
                            ? "Restricted"
                            : isAdmin
                              ? "Issue Book"
                              : "Request Issue"
                          : "Out of Stock"}
                      </Link>
                    )}

                    {isAdmin && (
                      <>
                        <Link
                          to={`/edit-book/${book.id}`}
                          className="flex items-center justify-center w-10 border border-border-color text-text-muted hover:text-primary hover:bg-primary/10 hover:border-primary rounded-lg transition-all"
                          title="Edit Book"
                        >
                          <i className="fas fa-edit"></i>
                        </Link>
                        <button
                          onClick={() => handleDelete(book.id)}
                          className="flex items-center justify-center w-10 border border-border-color text-text-muted hover:text-danger hover:bg-danger/10 hover:border-danger rounded-lg transition-all cursor-pointer"
                          title="Delete Book"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
