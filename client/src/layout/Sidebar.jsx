import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaChartPie, FaChartBar, FaPlusCircle, FaExchangeAlt,
  FaSearch, FaHistory, FaSignOutAlt, FaBoxOpen, FaUsers,
  FaTag, FaClipboardList, FaRulerCombined, FaFileInvoiceDollar,
  FaChevronDown, FaChevronLeft, FaBars,
} from "react-icons/fa";

const NAV_GROUPS = [
  {
    id: "overview",
    label: "Overview",
    icon: <FaChartPie />,
    items: [
      { name: "Dashboard",  path: "/",        icon: <FaChartPie /> },
      { name: "Reports",    path: "/reports",  icon: <FaChartBar /> },
    ],
  },
  {
    id: "billing",
    label: "Billing",
    icon: <FaFileInvoiceDollar />,
    items: [
      { name: "New Transaction", path: "/new",              icon: <FaPlusCircle /> },
      { name: "Direct Billing",  path: "/direct-billing",   icon: <FaFileInvoiceDollar /> },
    ],
  },
  {
    id: "records",
    label: "Records",
    icon: <FaExchangeAlt />,
    items: [
      { name: "Transactions",  path: "/transactions",    icon: <FaExchangeAlt /> },
      { name: "Sold",          path: "/sold",            icon: <FaExchangeAlt /> },
      { name: "Pending List",  path: "/pending-list",    icon: <FaClipboardList /> },
      { name: "Sold Ledger",   path: "/sold-ledger",     icon: <FaChartBar /> },
    ],
  },
  {
    id: "search",
    label: "Search",
    icon: <FaSearch />,
    items: [
      { name: "Barcode Search",    path: "/barcode-search",    icon: <FaSearch /> },
      { name: "Inventory Search",  path: "/inventory-search",  icon: <FaTag /> },
      { name: "Customer History",  path: "/customer-history",  icon: <FaHistory /> },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: <FaBoxOpen />,
    items: [
      { name: "Inventory Entry",    path: "/inventory-entry",    icon: <FaClipboardList /> },
      { name: "Bulk Stock",         path: "/bulk-stock",         icon: <FaRulerCombined /> },
      { name: "Upload Inventory",   path: "/upload-inventory",   icon: <FaBoxOpen /> },
    ],
  },
  {
    id: "clients",
    label: "Clients",
    icon: <FaUsers />,
    items: [
      { name: "Clients",   path: "/clients",          icon: <FaUsers /> },
      { name: "Pending",   path: "/pending-clients",  icon: <FaExchangeAlt /> },
    ],
  },
];

function Tooltip({ label, show }) {
  if (!show) return null;
  return (
    <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-50
      bg-[#1a1a2e] border border-white/20 text-white text-xs font-semibold
      px-3 py-1.5 rounded-xl whitespace-nowrap shadow-xl pointer-events-none">
      {label}
      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4
        border-transparent border-r-[#1a1a2e]" />
    </div>
  );
}

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Group open/close states persisted to localStorage
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sidebarGroups") || "{}");
      const defaults = {};
      NAV_GROUPS.forEach(g => { defaults[g.id] = true; });
      return { ...defaults, ...saved };
    } catch { return NAV_GROUPS.reduce((a, g) => ({ ...a, [g.id]: true }), {}); }
  });

  // Tooltip state for icon-only mode
  const [tooltip, setTooltip] = useState(null); // { id, label }

  const toggleGroup = (id) => {
    if (collapsed) return; // Don't toggle groups in icon mode
    setOpenGroups(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("sidebarGroups", JSON.stringify(next));
      return next;
    });
  };

  const toggleCollapsed = () => {
    setCollapsed(c => {
      localStorage.setItem("sidebarCollapsed", String(!c));
      return !c;
    });
  };

  // Auto-open the active group
  useEffect(() => {
    NAV_GROUPS.forEach(g => {
      if (g.items.some(i => i.path === location.pathname)) {
        setOpenGroups(prev => {
          const next = { ...prev, [g.id]: true };
          localStorage.setItem("sidebarGroups", JSON.stringify(next));
          return next;
        });
      }
    });
  }, [location.pathname]);

  const adminGroup = user?.role === "admin" ? [{
    id: "admin", label: "Admin", icon: <FaUsers />,
    items: [{ name: "Users", path: "/users", icon: <FaUsers /> }],
  }] : [];

  const allGroups = [...NAV_GROUPS, ...adminGroup];

  return (
    <div
      className={`
        relative flex-shrink-0 bg-black/40 backdrop-blur-xl border-r border-white/10
        transition-all duration-300 ease-in-out
        hidden md:flex flex-col
        ${collapsed ? "w-[68px]" : "w-[260px]"}
      `}
      style={{ height: "100%" }}
    >
      {/* Header */}
      <div className={`flex items-center border-b border-white/10 h-16 px-3 gap-2 flex-shrink-0 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <span className="text-xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent truncate">
            Jewel ERP
          </span>
        )}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-all flex-shrink-0"
        >
          {collapsed ? <FaBars size={14} /> : <FaChevronLeft size={13} />}
        </button>
      </div>

      {/* Nav groups — scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-1 px-2 scrollbar-hide">
        {allGroups.map(group => {
          const isGroupActive = group.items.some(i => i.path === location.pathname);
          const isOpen = openGroups[group.id] !== false;

          return (
            <div key={group.id}>
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.id)}
                onMouseEnter={() => collapsed && setTooltip({ id: `g_${group.id}`, label: group.label })}
                onMouseLeave={() => setTooltip(null)}
                className={`
                  relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5
                  transition-all text-left select-none
                  ${isGroupActive
                    ? "text-pink-300 bg-pink-500/10"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  }
                  ${collapsed ? "justify-center" : ""}
                `}
              >
                <span className={`text-base flex-shrink-0 ${isGroupActive ? "text-pink-400" : ""}`}>
                  {group.icon}
                </span>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-xs font-bold uppercase tracking-widest">{group.label}</span>
                    <FaChevronDown
                      size={10}
                      className={`transition-transform duration-200 flex-shrink-0 ${isOpen ? "rotate-0" : "-rotate-90"}`}
                    />
                  </>
                )}
                {tooltip?.id === `g_${group.id}` && <Tooltip label={group.label} show />}
              </button>

              {/* Group items */}
              {!collapsed && isOpen && (
                <div className="ml-2 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
                  {group.items.map((item) => {
                    const active = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                          ${active
                            ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md shadow-pink-500/20"
                            : "text-gray-400 hover:text-white hover:bg-white/8"
                          }
                        `}
                      >
                        <span className="text-sm flex-shrink-0">{item.icon}</span>
                        <span className="text-sm font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* In icon-only mode: render items as icon buttons */}
              {collapsed && (
                <div className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => {
                    const active = location.pathname === item.path;
                    return (
                      <div key={item.path} className="relative">
                        <Link
                          to={item.path}
                          onMouseEnter={() => setTooltip({ id: item.path, label: item.name })}
                          onMouseLeave={() => setTooltip(null)}
                          className={`
                            flex items-center justify-center w-full h-10 rounded-xl transition-all
                            ${active
                              ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md shadow-pink-500/20"
                              : "text-gray-500 hover:text-white hover:bg-white/10"
                            }
                          `}
                        >
                          <span className="text-sm">{item.icon}</span>
                        </Link>
                        {tooltip?.id === item.path && <Tooltip label={item.name} show />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Logout */}
      <div className="border-t border-white/10 p-2 flex-shrink-0">
        {collapsed ? (
          <div className="relative">
            <button
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              onMouseEnter={() => setTooltip({ id: "logout", label: "Logout" })}
              onMouseLeave={() => setTooltip(null)}
              className="w-full h-10 flex items-center justify-center rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all"
            >
              <FaSignOutAlt size={14} />
            </button>
            {tooltip?.id === "logout" && <Tooltip label="Logout" show />}
          </div>
        ) : (
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all w-full"
          >
            <FaSignOutAlt size={14} />
            <span className="text-sm font-semibold">Logout</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Mobile bottom-friendly top bar for small screens
export function MobileNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const allGroups = [...NAV_GROUPS,
    ...(user?.role === "admin" ? [{ id: "admin", label: "Admin", icon: <FaUsers />, items: [{ name: "Users", path: "/users", icon: <FaUsers /> }] }] : [])
  ];

  return (
    <>
      {/* Top bar */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 bg-black/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
        <span className="text-lg font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent">
          Jewel ERP
        </span>
        <button onClick={() => setOpen(o => !o)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 text-white">
          <FaBars size={16} />
        </button>
      </div>

      {/* Drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-[280px] bg-[#0f0f14] border-r border-white/10 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/10 flex-shrink-0">
              <span className="text-lg font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent">
                Jewel ERP
              </span>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>
            <div className="flex-1 py-3 px-3 space-y-1">
              {allGroups.map(group => (
                <div key={group.id}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 px-3 pt-3 pb-1">{group.label}</p>
                  {group.items.map(item => {
                    const active = location.pathname === item.path;
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white" : "text-gray-400 hover:text-white hover:bg-white/8"}`}>
                        <span className="text-sm">{item.icon}</span>
                        <span className="text-sm font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 p-3">
              <button onClick={() => { localStorage.clear(); window.location.reload(); }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-400 w-full">
                <FaSignOutAlt size={14} />
                <span className="text-sm font-semibold">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
