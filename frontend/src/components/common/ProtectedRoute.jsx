import { Navigate } from "react-router-dom";
import { useLibrary } from "../../context/LibraryContext";
import DashboardLayout from "../../layouts/DashboardLayout";

export default function ProtectedRoute({ children }) {
  const { user } = useLibrary();

  if (!user) return <Navigate to="/login" replace />;

  return <DashboardLayout>{children}</DashboardLayout>;
}
