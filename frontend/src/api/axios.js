import axios from "axios";

const backendURL = (
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"
).replace(/\/$/, "");

const api = axios.create({
  baseURL: `${backendURL}/api/v1`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("lib_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 1. Standard Token Expiry
    if (error.response && error.response.status === 401) {
      // 🚀 BUG 1 FIX: Agar login try kar rahe hain, toh page reload mat karo!
      if (!error.config.url.includes("/login")) {
        localStorage.removeItem("lib_token");
        localStorage.removeItem("lib_current_user");
        window.dispatchEvent(new Event("force_logout_unauthorized"));
      }
    }

    // 2. INACTIVE LOGOUT
    if (
      error.response &&
      error.response.status === 403 &&
      error.response.data?.isInactive
    ) {
      localStorage.removeItem("lib_token");
      localStorage.removeItem("lib_current_user");
      window.dispatchEvent(new Event("force_logout_inactive"));
    }

    return Promise.reject(error);
  },
);

export default api;
