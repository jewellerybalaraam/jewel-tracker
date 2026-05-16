import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

function MainLayout() {

  return (
    <div className="min-h-screen bg-[#0f0f14] text-white overflow-x-hidden">

      {/* BACKGROUND */}

      <div className="fixed inset-0 -z-10 overflow-hidden">

        <div className="absolute top-[-150px] left-[-120px] w-[350px] h-[350px] bg-pink-500 opacity-30 blur-[120px] rounded-full" />

        <div className="absolute top-[200px] right-[-100px] w-[300px] h-[300px] bg-orange-500 opacity-20 blur-[120px] rounded-full" />

        <div className="absolute bottom-[-100px] left-[20%] w-[400px] h-[400px] bg-purple-600 opacity-20 blur-[140px] rounded-full" />

      </div>

      <div className="flex flex-col md:flex-row">

        <Sidebar />

        <div className="flex-1 p-3 sm:p-5 md:p-8">

          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl overflow-hidden">

            <Outlet />

          </div>

        </div>

      </div>

    </div>
  );
}

export default MainLayout;