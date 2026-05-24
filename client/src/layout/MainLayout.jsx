import { useState } from "react";
import Sidebar, { MobileNav } from "./Sidebar";
import { Outlet } from "react-router-dom";

function MainLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  return (
    <div className="h-screen bg-[#0f0f14] text-white overflow-hidden flex flex-col">

      {/* BACKGROUND */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-150px] left-[-120px] w-[350px] h-[350px] bg-pink-500 opacity-30 blur-[120px] rounded-full" />
        <div className="absolute top-[200px] right-[-100px] w-[300px] h-[300px] bg-orange-500 opacity-20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-100px] left-[20%] w-[400px] h-[400px] bg-purple-600 opacity-20 blur-[140px] rounded-full" />
      </div>

      {/* Mobile top bar */}
      <MobileNav />

      {/* Desktop: sidebar + content, both filling remaining height */}
      <div className="hidden md:flex flex-1 min-h-0">

        {/* Sidebar scrolls independently */}
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

        {/* Main content scrolls independently */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 transition-all duration-300">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            <Outlet />
          </div>
        </div>

      </div>

      {/* Mobile content */}
      <div className="md:hidden flex-1 overflow-y-auto overflow-x-hidden p-3">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
          <Outlet />
        </div>
      </div>

    </div>
  );
}

export default MainLayout;
