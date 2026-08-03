import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";

import Dashboard from "../pages/dashboard/Dashboard";
import Login from "../pages/auth/Login";
import Books from "../pages/dashboard/Books";
import AddBook from "../pages/dashboard/AddBook";
import EditBook from "../pages/dashboard/EditBook";
import Issued from "../pages/dashboard/Issued";
import Members from "../pages/dashboard/Members";
import Profile from "../pages/profile/Profile";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/books"
        element={
          <ProtectedRoute>
            <Books />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-book"
        element={
          <ProtectedRoute>
            <AddBook />
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit-book/:id"
        element={
          <ProtectedRoute>
            <EditBook />
          </ProtectedRoute>
        }
      />
      <Route
        path="/issued"
        element={
          <ProtectedRoute>
            <Issued />
          </ProtectedRoute>
        }
      />
      <Route
        path="/members"
        element={
          <ProtectedRoute>
            <Members />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
