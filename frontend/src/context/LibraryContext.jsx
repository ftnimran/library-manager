import {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from "react";
import api from "../api/axios";
import { io } from "socket.io-client";

const LibraryContext = createContext();

export const LibraryProvider = ({ children }) => {
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [issued, setIssued] = useState([]);
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("lib_current_user")),
  );

  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isFetchingRef = useRef(false);

  const [dialogConfig, setDialogConfig] = useState({
    isOpen: false,
    type: "alert",
    iconType: "info",
    title: "",
    message: "",
    onConfirm: null,
  });
  const [isDialogSubmitting, setIsDialogSubmitting] = useState(false);

  const showAlert = (
    message,
    title = "Notice",
    iconType = "info",
    onConfirm = null,
  ) =>
    setDialogConfig({
      isOpen: true,
      type: "alert",
      iconType,
      title,
      message,
      onConfirm,
    });
  const showConfirm = (message, onConfirm, title = "Confirm Action") =>
    setDialogConfig({
      isOpen: true,
      type: "confirm",
      iconType: "confirm",
      title,
      message,
      onConfirm,
    });
  const closeDialog = () => {
    if (!isDialogSubmitting)
      setDialogConfig((prev) => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    const handleInactiveLogout = () => {
      logout();
      showAlert(
        "Your account is marked as Inactive due to 15 days of inactivity or by Admin. You have been logged out.",
        "Account Inactive",
        "warning",
        () => {
          window.location.href = "/login";
        },
      );
    };
    const handleUnauthorizedLogout = () => {
      logout();
      window.location.href = "/login";
    };
    window.addEventListener("force_logout_inactive", handleInactiveLogout);
    window.addEventListener(
      "force_logout_unauthorized",
      handleUnauthorizedLogout,
    );
    return () => {
      window.removeEventListener("force_logout_inactive", handleInactiveLogout);
      window.removeEventListener(
        "force_logout_unauthorized",
        handleUnauthorizedLogout,
      );
    };
  }, []);

  const loadData = useCallback(
    async (force = false) => {
      const token = localStorage.getItem("lib_token");
      if (!user || !token) return;
      if (isFetchingRef.current && !force) return;

      isFetchingRef.current = true;
      try {
        const [bookRes, txRes] = await Promise.all([
          api.get("/books"),
          api.get("/transactions"),
        ]);
        setBooks(bookRes.data.data.map((b) => ({ ...b, id: b._id })));
        setIssued(
          txRes.data.data.map((tx) => ({
            id: tx._id,
            bookId: tx.bookId?._id || tx.bookId,
            memberId: tx.userId?._id || tx.userId,
            issueDate: tx.issueDate ? tx.issueDate.substring(0, 10) : "Pending",
            returnDate: tx.returnDate
              ? tx.returnDate.substring(0, 10)
              : "Pending",
            status: tx.status,
          })),
        );

        if (user.role === "admin") {
          const userRes = await api.get("/users");
          setMembers(
            userRes.data.data.map((u) => ({
              ...u,
              id: u._id,
              joinDate: u.createdAt ? u.createdAt.substring(0, 10) : "Unknown",
            })),
          );
        } else {
          const userRes = await api.get(`/users/${user.id || user._id}`);
          const updatedUser = {
            ...user,
            ...userRes.data.data,
            id: userRes.data.data._id || user.id || user._id,
          };

          if (updatedUser.status === "Inactive") {
            logout();
            showAlert(
              "Your account is marked as Inactive due to 15 days of inactivity or by Admin. You have been logged out.",
              "Account Inactive",
              "warning",
              () => {
                window.location.href = "/login";
              },
            );
            return;
          }

          setUser(updatedUser);
          localStorage.setItem("lib_current_user", JSON.stringify(updatedUser));
          setMembers([
            {
              ...updatedUser,
              joinDate: updatedUser.createdAt
                ? updatedUser.createdAt.substring(0, 10)
                : "Unknown",
            },
          ]);
        }
      } catch (err) {
      } finally {
        isFetchingRef.current = false;
      }
    },
    [user?.id, user?.role],
  );

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem("lib_token");
    if (!user || !token) return;
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data.data.map((n) => ({ ...n, id: n._id })));
      setHasUnread(res.data.hasUnread);
    } catch (err) {}
  }, [user?.id]);

  const markAsSeen = useCallback(async () => {
    if (hasUnread) {
      setHasUnread(false);
      try {
        await api.post("/notifications/mark-seen");
      } catch (err) {}
    }
  }, [hasUnread]);

  useEffect(() => {
    const token = localStorage.getItem("lib_token");
    if (!user?.id || !token) return;

    fetchNotifications();
    loadData(true);

    const backendUrl = (
      import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"
    ).replace(/\/$/, "");
    const socket = io(backendUrl, { transports: ["websocket", "polling"] });

    let timeoutId;
    socket.on("db_updated", () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchNotifications();
        loadData(true);
      }, 500);
    });

    return () => {
      clearTimeout(timeoutId);
      socket.disconnect();
    };
  }, [user?.id, fetchNotifications, loadData]);

  const addNotification = async (
    title,
    desc,
    type = "primary",
    icon = "fa-bell",
    target = "all",
  ) => {
    try {
      await api.post("/notifications", { title, desc, type, icon, target });
    } catch (err) {}
  };
  const removeNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {}
  };
  const clearAllNotifications = async () => {
    try {
      await api.delete("/notifications/clear-all");
      setNotifications([]);
      setHasUnread(false);
    } catch (err) {}
  };

  const login = async (identifier, password) => {
    try {
      const res = await api.post("/auth/login", { identifier, password });
      localStorage.setItem("lib_token", res.data.token);
      localStorage.setItem("lib_current_user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Login failed",
      };
    }
  };

  const signup = async (userData) => {
    try {
      const res = await api.post("/auth/signup", userData);
      localStorage.setItem("lib_token", res.data.token);
      localStorage.setItem("lib_current_user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      await addNotification(
        "Account Created",
        `Hello ${res.data.user.name}, your account is ready!`,
        "success",
        "fa-user",
        res.data.user.email,
      );
      await addNotification(
        "New Registration",
        `${res.data.user.name} signed up as a new student.`,
        "primary",
        "fa-user-plus",
        "admin",
      );
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Signup failed",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("lib_token");
    localStorage.removeItem("lib_current_user");
    setUser(null);
    setBooks([]);
    setMembers([]);
    setIssued([]);
    setNotifications([]);
    setHasUnread(false);
  };

  // 🚀 NEW: FORGOT PASSWORD APIS
  const forgotPasswordSendOtp = async (email) => {
    try {
      const res = await api.post("/auth/forgot-password", { email });
      return { success: true, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Failed to send OTP",
      };
    }
  };

  const verifyResetOtp = async (email, otp) => {
    try {
      const res = await api.post("/auth/verify-otp", { email, otp });
      return { success: true, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Invalid OTP",
      };
    }
  };

  const resetPassword = async (email, otp, password) => {
    try {
      const res = await api.post("/auth/reset-password", {
        email,
        otp,
        password,
      });
      return { success: true, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Reset failed",
      };
    }
  };

  const addBook = async (bookData) => {
    try {
      await api.post("/books", bookData);
      await addNotification(
        "New Book Added",
        `${bookData.title} is now available in the library.`,
        "info",
        "fa-book",
        "all",
      );
      await loadData(true);
      return true;
    } catch (err) {
      showAlert(err.response?.data?.message || "Failed", "Error", "error");
      return false;
    }
  };

  const updateBook = async (id, bookData) => {
    try {
      await api.put(`/books/${id}`, bookData);
      await addNotification(
        "Book Updated",
        `${bookData.title} details were updated.`,
        "info",
        "fa-edit",
        "all",
      );
      await loadData(true);
      return true;
    } catch (err) {
      showAlert(err.response?.data?.message || "Failed", "Error", "error");
      return false;
    }
  };

  const deleteBook = async (id) => {
    try {
      await api.delete(`/books/${id}`);
      await loadData(true);
      return true;
    } catch (err) {
      showAlert("Failed to delete", "Error", "error");
      return false;
    }
  };

  const addMember = async (memberData) => {
    try {
      await api.post("/auth/signup", memberData);
      await addNotification(
        "Member Added",
        `${memberData.name} has been registered successfully.`,
        "success",
        "fa-check",
        "admin",
      );
      await loadData(true);
      return true;
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Email/Username Taken",
        "Error",
        "error",
      );
      return false;
    }
  };

  const updateMember = async (id, memberData) => {
    try {
      await api.put(`/users/${id}`, memberData);
      await addNotification(
        "Profile Updated by Admin",
        `Your profile has been modified by the Administrator.`,
        "warning",
        "fa-user-edit",
        memberData.email,
      );
      await loadData(true);
      return true;
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Update failed",
        "Error",
        "error",
      );
      return false;
    }
  };

  const deleteMember = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      await loadData(true);
      return true;
    } catch (err) {
      showAlert("Failed to delete", "Error", "error");
      return false;
    }
  };

  const updateProfile = async (id, data) => {
    try {
      const res = await api.put(`/users/${id}`, data);
      const updated = {
        ...user,
        ...res.data.data,
        id: res.data.data._id || user.id,
      };
      setUser(updated);
      localStorage.setItem("lib_current_user", JSON.stringify(updated));
      await addNotification(
        "Profile Updated",
        `Your profile details were updated successfully.`,
        "success",
        "fa-user-edit",
        user.email,
      );
      if (user.role !== "admin") {
        await addNotification(
          "Student Profile Updated",
          `${user.name} updated their profile.`,
          "info",
          "fa-user-edit",
          "admin",
        );
      }
      await loadData(true);
      return true;
    } catch (err) {
      return false;
    }
  };

  const createTransaction = async (data) => {
    try {
      await api.post("/transactions", data);
      await loadData(true);
      return true;
    } catch (err) {
      showAlert(err.response?.data?.message || "Failed", "Error", "error");
      return false;
    }
  };

  const updateTxStatus = async (id, status) => {
    try {
      await api.put(`/transactions/${id}/status`, { status });
      await loadData(true);
      return true;
    } catch (err) {
      showAlert("Failed to update status", "Error", "error");
      return false;
    }
  };

  const acceptIssueRequest = async (id) => {
    const tx = issued.find((t) => t.id === id);
    const success = await updateTxStatus(id, "Issued");
    if (success && tx) {
      const member = members.find((m) => m.id === tx.memberId) || {
        name: "Student",
        email: "all",
      };
      const book = books.find((b) => b.id === tx.bookId) || { title: "Book" };
      await addNotification(
        "Request Accepted",
        `Your request for "${book.title}" was approved. Happy reading!`,
        "success",
        "fa-circle-check",
        member.email,
      );
    }
  };

  const rejectIssueRequest = async (id) => {
    const tx = issued.find((t) => t.id === id);
    const success = await updateTxStatus(id, "Rejected");
    if (success && tx) {
      const member = members.find((m) => m.id === tx.memberId) || {
        name: "Student",
        email: "all",
      };
      const book = books.find((b) => b.id === tx.bookId) || { title: "Book" };
      await addNotification(
        "Request Declined",
        `Your request for "${book.title}" was rejected by the Admin.`,
        "danger",
        "fa-circle-xmark",
        member.email,
      );
    }
  };

  const returnBook = async (id) => {
    const tx = issued.find((t) => t.id === id);
    const success = await updateTxStatus(id, "Returned");
    if (success && tx) {
      const member = members.find((m) => m.id === tx.memberId) || {
        name: "Student",
        email: "all",
      };
      const book = books.find((b) => b.id === tx.bookId) || { title: "Book" };
      if (user?.role === "admin") {
        await addNotification(
          "Book Returned",
          `Admin marked "${book.title}" as returned.`,
          "info",
          "fa-arrow-rotate-left",
          member.email,
        );
      } else {
        await addNotification(
          "Book Returned",
          `${member.name} returned "${book.title}".`,
          "primary",
          "fa-arrow-rotate-left",
          "admin",
        );
        await addNotification(
          "Book Returned",
          `You successfully returned "${book.title}".`,
          "info",
          "fa-arrow-rotate-left",
          member.email,
        );
      }
    }
  };

  const dialogIcons = {
    success: {
      icon: "fa-circle-check",
      color: "text-success",
      bg: "bg-success/10",
    },
    error: {
      icon: "fa-circle-xmark",
      color: "text-danger",
      bg: "bg-danger/10",
    },
    warning: {
      icon: "fa-triangle-exclamation",
      color: "text-warning",
      bg: "bg-warning/10",
    },
    info: {
      icon: "fa-circle-info",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    confirm: {
      icon: "fa-circle-question",
      color: "text-primary",
      bg: "bg-primary/10",
    },
  };
  const currentIcon = dialogIcons[dialogConfig.iconType] || dialogIcons.info;

  return (
    <LibraryContext.Provider
      value={{
        books,
        setBooks,
        members,
        setMembers,
        issued,
        setIssued,
        user,
        setUser,
        login,
        signup,
        logout,
        notifications,
        addNotification,
        removeNotification,
        clearAllNotifications,
        hasUnread,
        setHasUnread,
        markAsSeen,
        isSidebarOpen,
        setIsSidebarOpen,
        showAlert,
        showConfirm,
        addBook,
        updateBook,
        deleteBook,
        addMember,
        updateMember,
        deleteMember,
        updateProfile,
        createTransaction,
        acceptIssueRequest,
        rejectIssueRequest,
        returnBook,
        forgotPasswordSendOtp,
        verifyResetOtp,
        resetPassword, // 🚀 EXPOSED NEW APIs
      }}
    >
      {children}
      {dialogConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-border-color">
            <div
              className={`w-16 h-16 ${currentIcon.bg} ${currentIcon.color} rounded-full flex items-center justify-center mx-auto mb-4`}
            >
              <i className={`fas ${currentIcon.icon} text-3xl`}></i>
            </div>
            <h3 className="text-xl font-bold text-text-dark mb-2">
              {dialogConfig.title}
            </h3>
            <p className="text-text-muted mb-8">{dialogConfig.message}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              {dialogConfig.type === "confirm" && (
                <button
                  onClick={closeDialog}
                  disabled={isDialogSubmitting}
                  className="px-5 py-2.5 rounded-lg font-bold text-text-muted hover:bg-bg-light border border-border-color transition-all w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={async () => {
                  if (dialogConfig.onConfirm) {
                    setIsDialogSubmitting(true);
                    try {
                      await dialogConfig.onConfirm();
                    } finally {
                      setIsDialogSubmitting(false);
                      setDialogConfig((prev) => ({ ...prev, isOpen: false }));
                    }
                  } else {
                    setDialogConfig((prev) => ({ ...prev, isOpen: false }));
                  }
                }}
                disabled={isDialogSubmitting}
                className={`px-5 py-2.5 rounded-lg font-bold text-white transition-all w-full shadow-md ${dialogConfig.iconType === "error" ? "bg-danger hover:bg-[#e04040]" : dialogConfig.iconType === "warning" ? "bg-warning hover:bg-[#d4ac0d]" : "bg-primary hover:bg-[#5b54e0]"} disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2`}
              >
                {isDialogSubmitting ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : dialogConfig.type === "confirm" ? (
                  "Confirm"
                ) : (
                  "OK"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </LibraryContext.Provider>
  );
};
export const useLibrary = () => useContext(LibraryContext);
