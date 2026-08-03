import { useState, useEffect } from "react";
import { useLibrary } from "../../context/LibraryContext";
import { useSearchParams } from "react-router-dom";
import SearchableSelect from "../../components/ui/SearchableSelect";

// 🚀 Indian Timezone Fix for correct daily calculation
const getLocalDateString = (daysToAdd = 0) => {
  const d = new Date();
  const istString = d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istString);
  istDate.setDate(istDate.getDate() + daysToAdd);
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, "0");
  const day = String(istDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// 🚀 Convert YYYY-MM-DD to DD-MM-YYYY for display
const formatDateUI = (dateStr) => {
  if (!dateStr || dateStr === "Pending") return "Pending";
  const [year, month, day] = dateStr.split("-");
  return `${day}-${month}-${year}`;
};

export default function Issued() {
  const {
    user,
    books,
    members,
    issued,
    showAlert,
    showConfirm,
    acceptIssueRequest,
    rejectIssueRequest,
    returnBook,
    createTransaction,
    addNotification,
  } = useLibrary();
  const [searchParams] = useSearchParams();

  const defaultDateString = getLocalDateString(25);

  const isAdmin = user?.role === "admin";
  const currentMember = members.find((m) => m.email === user?.email);
  const isStudentDeactivated =
    !isAdmin && currentMember?.status === "Deactivate";

  const [bookId, setBookId] = useState(searchParams.get("bookId") || "");
  const [memberId, setMemberId] = useState("");
  const [returnDate, setReturnDate] = useState(defaultDateString);
  const [txSearch, setTxSearch] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  // 🚀 LOADER STATE
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAdmin && currentMember) setMemberId(currentMember.id);
  }, [isAdmin, currentMember]);

  useEffect(() => {
    if (memberId && bookId) {
      const isAlreadyHandled = issued.some(
        (tx) =>
          tx.bookId === bookId &&
          tx.memberId === memberId &&
          (tx.status === "Issued" || tx.status === "Pending"),
      );
      if (isAlreadyHandled) setBookId("");
    }
  }, [memberId, bookId, issued]);

  const bookOptions = books.map((b) => {
    const activeTx = memberId
      ? issued.find(
          (tx) =>
            tx.bookId === b.id &&
            tx.memberId === memberId &&
            (tx.status === "Issued" || tx.status === "Pending"),
        )
      : null;
    let labelText = `${b.title} (Qty: ${b.available})`;
    let isDisabled = false;

    if (activeTx) {
      labelText = `${b.title} (${activeTx.status})`;
      isDisabled = true;
    } else if (b.available === 0 && b.id !== bookId) {
      labelText = `${b.title} (Out of Stock)`;
      isDisabled = true;
    }
    return { value: b.id, label: labelText, disabled: isDisabled };
  });

  const memberOptions = members.map((m) => {
    const isBadStatus = m.status === "Inactive" || m.status === "Deactivate";
    return {
      value: m.id,
      label: `${m.name} (${m.phone})${isBadStatus ? ` [${m.status}]` : ""}`,
      disabled: isBadStatus,
    };
  });

  const handleIssue = async (e) => {
    e.preventDefault();
    if (isSubmitting || isStudentDeactivated) return;
    if (!bookId || !memberId || !returnDate) {
      showAlert("Please fill all fields.", "Missing Fields", "warning");
      return;
    }

    const alreadyActive = issued.some(
      (tx) =>
        tx.bookId === bookId &&
        tx.memberId === memberId &&
        (tx.status === "Issued" || tx.status === "Pending"),
    );
    if (alreadyActive) return;

    setIsSubmitting(true); // 🚀 LOADER START
    const success = await createTransaction({
      bookId,
      userId: memberId,
      returnDate,
    });

    if (success) {
      const book = books.find((b) => b.id === bookId) || { title: "Book" };
      const member = members.find((m) => m.id === memberId) || {
        name: "Student",
        email: "all",
      };

      if (isAdmin) {
        addNotification(
          "Book Issued",
          `You successfully issued "${book.title}" to ${member.name}.`,
          "success",
          "fa-check",
          "admin",
        );
        addNotification(
          "New Book Issued",
          `Admin has issued "${book.title}" to your account.`,
          "primary",
          "fa-book",
          member.email,
        );
        showAlert("Book issued successfully!", "Success", "success");
      } else {
        addNotification(
          "New Issue Request",
          `${member.name} requested "${book.title}".`,
          "warning",
          "fa-bell",
          "admin",
        );
        addNotification(
          "Request Sent",
          `Your request for "${book.title}" was submitted to Admin.`,
          "info",
          "fa-paper-plane",
          member.email,
        );
        showAlert("Request sent successfully!", "Success", "success");
      }

      setBookId("");
      if (isAdmin) setMemberId("");
      setReturnDate(defaultDateString);
    }
    setIsSubmitting(false); // 🚀 LOADER STOP
  };

  const today = getLocalDateString(0);

  const pendingCount = issued.filter((tx) => {
    if (!isAdmin && tx.memberId !== currentMember?.id) return false;
    return tx.status === "Pending";
  }).length;

  const overdueCount = issued.filter((tx) => {
    if (!isAdmin && tx.memberId !== currentMember?.id) return false;
    return tx.status === "Issued" && tx.returnDate <= today;
  }).length;

  const filteredTransactions = issued
    .filter((item) => {
      if (!isAdmin && item.memberId !== currentMember?.id) return false;
      if (activeTab === "pending" && item.status !== "Pending") return false;
      if (activeTab === "issued" && item.status !== "Issued") return false;
      if (
        activeTab === "returned" &&
        item.status !== "Returned" &&
        item.status !== "Rejected"
      )
        return false;

      const searchLower = txSearch.toLowerCase();
      const book = books.find((b) => b.id === item.bookId) || { title: "" };
      const member = members.find((m) => m.id === item.memberId) || {
        name: "",
        email: "",
      };

      return (
        item.id.toLowerCase().includes(searchLower) ||
        book.title.toLowerCase().includes(searchLower) ||
        member.name.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));

  return (
    <div className="animate-fade-in w-full max-w-full overflow-hidden">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-dark">
          {isAdmin ? "Manage" : "Issue/Return"}
        </h1>
        <p className="text-text-muted mt-1">
          {isAdmin
            ? "Review requests and manage issues."
            : "Request a new book and track your transactions."}
        </p>
      </div>

      <div className="bg-bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-border-color mb-8">
        <h3 className="text-xl font-bold text-primary mb-6">
          {isAdmin ? "Issue a New Book" : "Request a Book"}
        </h3>

        {isStudentDeactivated && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger text-danger rounded-xl flex items-center gap-3">
            <i className="fa-solid fa-triangle-exclamation text-2xl"></i>
            <div>
              <h4 className="font-bold">Account Deactivated</h4>
              <p className="text-sm">
                {currentMember?.deactivatedBySystem
                  ? "Please return your overdue books to reactivate your account and request new books."
                  : "Your account has been deactivated by the Administrator. Please contact support."}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleIssue} className="flex flex-wrap items-end gap-5">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium text-text-dark mb-1.5">
              Select Book
            </label>
            <SearchableSelect
              options={bookOptions}
              value={bookId}
              onChange={setBookId}
              placeholder="-- Search & Choose Book --"
              isDisabled={isStudentDeactivated || isSubmitting}
            />
          </div>
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium text-text-dark mb-1.5">
              Select Member {isAdmin ? "" : "(Auto-filled)"}
            </label>
            <SearchableSelect
              options={memberOptions}
              value={memberId}
              onChange={setMemberId}
              placeholder="-- Search & Choose Member --"
              isDisabled={!isAdmin || isStudentDeactivated || isSubmitting}
            />
          </div>
          <div className="w-[160px] flex-grow sm:flex-grow-0">
            <label className="block text-sm font-medium text-text-dark mb-1.5">
              Return Date
            </label>
            <input
              type="date"
              className="w-full p-3 rounded-lg border border-border-color bg-bg-light outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all text-text-dark disabled:opacity-50"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              required
              disabled={isStudentDeactivated || isSubmitting}
            />
          </div>

          {/* 🚀 SUBMIT BUTTON LOADER */}
          <button
            type="submit"
            disabled={isStudentDeactivated || isSubmitting}
            className={`px-6 h-[50px] rounded-lg font-medium shadow-md transition-all flex items-center justify-center gap-2 w-full sm:w-auto text-white ${isStudentDeactivated || isSubmitting ? "bg-text-muted opacity-50 cursor-not-allowed" : "bg-primary hover:bg-[#5b54e0] cursor-pointer"}`}
          >
            {isSubmitting ? (
              <i className="fa-solid fa-spinner fa-spin"></i>
            ) : null}
            {isSubmitting
              ? "Processing..."
              : isAdmin
                ? "Confirm Issue"
                : "Send Request"}
          </button>
        </form>
      </div>

      <div className="bg-bg-white rounded-2xl shadow-sm border border-border-color overflow-hidden w-full">
        <div className="px-6 pt-6 border-b border-border-color bg-primary/5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-text-dark">
              Recent Transactions
            </h3>
            <div className="relative w-full sm:w-72">
              <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm"></i>
              <input
                type="text"
                placeholder="Search tx id, book, member..."
                className="w-full pl-10 pr-4 py-2 border border-border-color rounded-lg bg-bg-light outline-none text-sm focus:border-primary"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4 sm:gap-6 mt-2 overflow-x-auto custom-scrollbar w-full">
            <button
              onClick={() => setActiveTab("pending")}
              className={`pb-3 font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === "pending" ? "text-primary border-primary" : "text-text-muted border-transparent hover:text-text-dark"}`}
            >
              Pending Requests{" "}
              {pendingCount > 0 && (
                <span className="ml-1 bg-warning text-white text-[10px] px-2 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("issued")}
              className={`pb-3 font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === "issued" ? "text-primary border-primary" : "text-text-muted border-transparent hover:text-text-dark"}`}
            >
              Active Issues{" "}
              {overdueCount > 0 && (
                <span className="ml-1 bg-danger text-white text-[10px] px-2 py-0.5 rounded-full">
                  {overdueCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("returned")}
              className={`pb-3 font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === "returned" ? "text-primary border-primary" : "text-text-muted border-transparent hover:text-text-dark"}`}
            >
              Returned History
            </button>
          </div>
        </div>

        <div className="overflow-x-auto w-full custom-scrollbar">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead>
              <tr className="bg-bg-light/50 text-primary border-b border-border-color text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold whitespace-nowrap">Tx ID</th>
                <th className="p-4 font-semibold whitespace-nowrap">
                  Book Info
                </th>
                <th className="p-4 font-semibold whitespace-nowrap">
                  Member Info
                </th>
                <th className="p-4 font-semibold whitespace-nowrap">Dates</th>
                <th className="p-4 font-semibold whitespace-nowrap">Status</th>
                <th className="p-4 font-semibold whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="p-8 text-center text-text-muted font-medium"
                  >
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((item) => {
                  const book = books.find((b) => b.id === item.bookId) || {
                    title: "Unknown",
                  };
                  const member = members.find(
                    (m) => m.id === item.memberId,
                  ) || { name: "Unknown", email: "" };

                  let displayStatus = item.status;
                  let statusClass = "bg-primary/20 text-primary";

                  if (item.status === "Returned")
                    statusClass = "bg-success/20 text-success";
                  if (item.status === "Rejected")
                    statusClass = "bg-danger/20 text-danger";
                  if (item.status === "Pending")
                    statusClass = "bg-warning/20 text-warning";
                  if (item.status === "Issued" && item.returnDate <= today) {
                    displayStatus = "Overdue";
                    statusClass = "bg-danger/20 text-danger";
                  }

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-border-color hover:bg-black/5 transition-colors"
                    >
                      <td className="p-4 font-mono text-sm text-text-muted whitespace-nowrap">
                        #{item.id.slice(-6)}
                      </td>
                      <td className="p-4 font-medium text-text-dark whitespace-nowrap">
                        {book.title}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-medium text-text-dark">
                          {member.name}
                        </div>
                        <div className="text-xs text-text-muted mt-1">
                          {member.email}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-text-dark whitespace-nowrap">
                        <div>Req/Issue: {formatDateUI(item.issueDate)}</div>
                        <div className="text-danger mt-1">
                          Return: {formatDateUI(item.returnDate)}
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`${statusClass} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block`}
                        >
                          {displayStatus}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {isAdmin && item.status === "Pending" ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                showConfirm("Accept request?", () =>
                                  acceptIssueRequest(item.id),
                                )
                              }
                              className="bg-success text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#00a38d] transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() =>
                                showConfirm("Reject request?", () =>
                                  rejectIssueRequest(item.id),
                                )
                              }
                              className="bg-danger text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#e04040] transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : item.status === "Issued" ? (
                          <button
                            onClick={() =>
                              showConfirm("Return this book?", () =>
                                returnBook(item.id),
                              )
                            }
                            className="bg-secondary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#00a38d] shadow-sm transition-all cursor-pointer"
                          >
                            Return
                          </button>
                        ) : (
                          <i
                            className={`fa-solid ${item.status === "Rejected" ? "fa-circle-xmark text-danger" : item.status === "Pending" ? "fa-clock text-warning" : "fa-check-circle text-success"} text-xl ml-2 opacity-80`}
                          ></i>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
