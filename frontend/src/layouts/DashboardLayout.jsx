import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen relative">
      <Sidebar />
      <div className="flex-1 w-full lg:ml-[260px] p-4 sm:p-8 pt-[90px] sm:pt-[102px] transition-all duration-300">
        <Header />
        {children}
      </div>
    </div>
  );
}
