import {
  FaChartPie,
  FaChartBar,
  FaPlusCircle,
  FaExchangeAlt,
  FaSearch,
  FaHistory,
  FaSignOutAlt,
  FaBoxOpen,
  FaUsers,
  FaTag,
} from "react-icons/fa";

import {
  Link,
  useLocation,
} from "react-router-dom";

function Sidebar() {

  const location = useLocation();

  const user = JSON.parse(localStorage.getItem("user"));

  const menus = [
    { name: "Dashboard",        path: "/",                  icon: <FaChartPie /> },
    { name: "New Transaction",  path: "/new",               icon: <FaPlusCircle /> },
    { name: "Transactions",     path: "/transactions",      icon: <FaExchangeAlt /> },
    { name: "Sold",             path: "/sold",              icon: <FaExchangeAlt /> },
    { name: "Pending List",     path: "/pending-list",      icon: <FaUsers /> },
    { name: "Sold Ledger",      path: "/sold-ledger",       icon: <FaUsers /> },
    { name: "Barcode Search",   path: "/barcode-search",    icon: <FaSearch /> },
    { name: "Inventory Search", path: "/inventory-search",  icon: <FaTag /> },
    { name: "Customer History", path: "/customer-history",  icon: <FaHistory /> },
    { name: "Upload Inventory", path: "/upload-inventory",  icon: <FaBoxOpen /> },
    { name: "Clients",          path: "/clients",           icon: <FaUsers /> },
    { name: "Pending",          path: "/pending-clients",   icon: <FaExchangeAlt /> },
    { name: "Reports",          path: "/reports",           icon: <FaChartBar /> },

    ...(user?.role === "admin"
      ? [{ name: "Users", path: "/users", icon: <FaUsers /> }]
      : []),
  ];

  return (
    <div className="w-full lg:w-[280px] bg-black/30 backdrop-blur-xl border-b lg:border-r border-white/10 p-4 lg:min-h-screen">

      <h1 className="text-3xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent mb-6 text-center lg:text-left">
        Jewel ERP
      </h1>

      <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible scrollbar-hide pb-2">
        {menus.map((menu, index) => (
          <Link
            key={index}
            to={menu.path}
            className={`
              flex items-center gap-3 px-5 py-4 rounded-2xl transition-all
              whitespace-nowrap min-w-[220px] lg:min-w-full flex-shrink-0
              ${location.pathname === menu.path
                ? "bg-gradient-to-r from-pink-500 to-purple-500 shadow-lg"
                : "bg-white/5 hover:bg-white/10"
              }
            `}
          >
            <span className="text-lg">{menu.icon}</span>
            <span className="font-semibold">{menu.name}</span>
          </Link>
        ))}
      </div>

      <button
        onClick={() => { localStorage.clear(); window.location.reload(); }}
        className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-500 hover:bg-red-600 transition-all mt-5 w-full"
      >
        <FaSignOutAlt />
        Logout
      </button>

    </div>
  );
}

export default Sidebar;