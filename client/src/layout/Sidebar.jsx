import {
  FaChartPie,
  FaPlusCircle,
  FaExchangeAlt,
  FaSearch,
  FaHistory,
  FaUsers,
  FaBoxOpen,
} from "react-icons/fa";

import {
  Link,
  useLocation,
} from "react-router-dom";

function Sidebar() {

  const location =
    useLocation();

  const user = JSON.parse(
    localStorage.getItem("user")
  );

  const menus = [

    {
      name: "Dashboard",
      path: "/",
      icon: <FaChartPie />,
    },

    {
      name: "New Transaction",
      path: "/new",
      icon: <FaPlusCircle />,
    },

    {
      name: "Transactions",
      path: "/transactions",
      icon: <FaExchangeAlt />,
    },

    {
      name: "Barcode Search",
      path: "/barcode-search",
      icon: <FaSearch />,
    },

    {
      name: "Customer History",
      path: "/customer-history",
      icon: <FaHistory />,
    },

    {
      name: "Upload Inventory",
      path: "/upload-inventory",
      icon: <FaBoxOpen />,
    },

    {
      name: "Clients",
      path: "/clients",
      icon: <FaUsers />,
    },

    {
      name: "Pending",
      path: "/pending-clients",
      icon: <FaExchangeAlt />,
    },

    ...(user?.role === "admin"
      ? [
          {
            name: "Users",
            path: "/users",
            icon: <FaUsers />,
          },
        ]
      : []),
  ];

  return (

    <div className="w-full md:w-[280px] bg-black/30 backdrop-blur-xl border-r border-white/10 p-5 md:min-h-screen">

      <h1 className="text-3xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent mb-10">
        Jewel ERP
      </h1>

      <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible">

        {menus.map(
          (menu, index) => (

            <Link
              key={index}
              to={menu.path}
              className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all whitespace-nowrap
              ${
                location.pathname ===
                menu.path
                  ? "bg-gradient-to-r from-pink-500 to-purple-500"
                  : "bg-white/5 hover:bg-white/10"
              }`}
            >

              <span className="text-lg">
                {menu.icon}
              </span>

              <span className="font-semibold">
                {menu.name}
              </span>

            </Link>

          )
        )}

      </div>

    </div>
  );
}

export default Sidebar;