import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Truck,
  Users,
  Wrench,
  Map,
  BarChart3,
  FileText,
  Settings,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Search,
  User,
  FileSearch,
  Shield,
  UserCog,
  Car,
  UserCircle,
  X,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useAuth } from "../lib/auth";
import { remindersApi } from "../lib/api";
import type { Reminder } from "../lib/types";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "../components/ui/popover";
import { FloatingChatWidget } from "./FloatingChatWidget";

// Define which roles can see each nav item
interface NavItem {
  icon?: any;
  label: string;
  path?: string;
  roles: string[];      // which roles can see this item
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/app", roles: ["admin"] },
  {
    label: "Fleet",
    roles: ["admin"],
    children: [
      { icon: Truck, label: "Vehicles", path: "/app/fleet/vehicles", roles: ["admin"] },
      { icon: Users, label: "Drivers", path: "/app/fleet/drivers", roles: ["admin"] },
    ]
  },
  { icon: Wrench, label: "Maintenance", path: "/app/maintenance", roles: ["admin"] },
  { icon: Map, label: "Routing & Tracking", path: "/app/routing", roles: ["admin"] },
  { icon: BarChart3, label: "Analytics", path: "/app/analytics", roles: ["admin"] },
  { icon: FileSearch, label: "Audit Logs", path: "/app/audit-logs", roles: ["admin"] },
  { icon: FileText, label: "Documents", path: "/app/documents", roles: ["admin"] },
  { icon: Settings, label: "Settings", path: "/app/settings", roles: ["admin"] },
];

// Role display config
const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  admin: { label: "Administrator", color: "text-indigo-600 bg-indigo-50 border-indigo-200", icon: Shield },
};

function filterNavByRole(items: NavItem[], role: string): NavItem[] {
  return items
    .filter(item => item.roles.includes(role))
    .map(item => {
      if (item.children) {
        const filteredChildren = item.children.filter(child => child.roles.includes(role));
        if (filteredChildren.length === 0) return null;
        return { ...item, children: filteredChildren };
      }
      return item;
    })
    .filter(Boolean) as NavItem[];
}

export function Shell() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [loadingReminders, setLoadingReminders] = React.useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const userRole = user?.role || "admin";
  const roleConfig = ROLE_CONFIG[userRole] || ROLE_CONFIG.admin;
  const RoleIcon = roleConfig.icon;
  const filteredNav = filterNavByRole(NAV_ITEMS, userRole);

  const loadReminders = React.useCallback(async (silent = false) => {
    if (!silent) setLoadingReminders(true);
    try {
      const list = await remindersApi.getAll();
      const mapped = list
        .filter((r: any) => !r.status || (r.status !== 'completed' && r.status !== 'cancelled'))
        .map((r: any) => ({
          id: r.id || r._id,
          title: r.title || r.message || 'Upcoming Reminder',
          description: r.description || r.message || '',
          date: r.scheduleAt ? new Date(r.scheduleAt).toLocaleDateString() : (r.date || ''),
          vehicle: typeof r.vehicle === 'object' ? r.vehicle?.registration : (r.vehicle || 'Unknown'),
          critical: r.critical || r.type === 'urgent' || r.type === 'critical',
          dueDate: r.scheduleAt || r.date,
        }));
      setReminders(mapped);
    } catch (err) {
      if (!silent) console.warn("Failed to load reminders:", err);
      setReminders([]);
    } finally {
      if (!silent) setLoadingReminders(false);
    }
  }, []);

  React.useEffect(() => {
    loadReminders(true);
    const interval = setInterval(() => loadReminders(true), 5000);
    return () => clearInterval(interval);
  }, [loadReminders]);

  const handleNotificationsOpen = (open: boolean) => {
    setNotificationsOpen(open);
    if (open) {
      loadReminders(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-(--color-background) text-(--color-foreground)">
      {/* Sidebar - Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 260 }}
        className={cn(
          "hidden md:flex flex-col border-r border-(--color-border) bg-(--color-background) fixed h-full z-40",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-(--color-border)">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-(--color-primary) flex items-center justify-center text-white font-bold">
              F
            </div>
            {!collapsed && (
              <span className="font-bold text-xl tracking-tight">FleetPro</span>
            )}
          </div>
        </div>

        {/* Role Badge */}
        {!collapsed && (
          <div className="px-4 pt-4 pb-2">
            <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider", roleConfig.color)}>
              <RoleIcon size={14} />
              {roleConfig.label}
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredNav.map((item, idx) => {
            if (item.children) {
              return (
                <div key={idx} className="space-y-1">
                  {!collapsed && (
                    <h3 className="text-xs font-semibold text-(--color-foreground-muted) uppercase tracking-wider px-2 py-2">
                      {item.label}
                    </h3>
                  )}
                  {item.children.map((child) => (
                    <NavItemComponent
                      key={child.path}
                      icon={child.icon}
                      label={child.label}
                      path={child.path!}
                      collapsed={collapsed}
                    />
                  ))}
                </div>
              );
            }
            return (
              <NavItemComponent
                key={item.path}
                icon={item.icon!}
                label={item.label}
                path={item.path!}
                collapsed={collapsed}
              />
            );
          })}
        </nav>

        <div className="p-4 border-t border-(--color-border)">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-(--color-background-muted) transition-colors text-(--color-foreground-muted)"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            {!collapsed && <span className="text-sm font-medium">Collapse</span>}
          </button>
          <button
            onClick={handleLogout}
            className="w-full mt-2 flex items-center gap-3 p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
          >
            <LogOut size={20} />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
        "md:pl-[var(--sidebar-width)]",
        collapsed ? "[--sidebar-width:80px]" : "[--sidebar-width:260px]"
      )}>
        {/* Navbar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-(--color-border) bg-(--color-background) sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu size={24} />
            </button>
            <div className="hidden md:flex items-center bg-(--color-background-muted) px-3 py-1.5 rounded-lg border border-(--color-border) w-64">
              <Search size={16} className="text-(--color-foreground-muted)" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-full outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Popover open={notificationsOpen} onOpenChange={handleNotificationsOpen}>
              <PopoverTrigger asChild>
                <button className="p-2 rounded-full hover:bg-(--color-background-muted) relative transition-colors">
                  <Bell size={20} />
                  {reminders.length > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="border-b border-(--color-border) p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base">Notifications</h3>
                    <span className="text-xs text-(--color-foreground-muted) bg-(--color-background-muted) px-2 py-1 rounded">
                      {reminders.length}
                    </span>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {loadingReminders ? (
                    <div className="p-8 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border border-(--color-border) border-t-current"></div>
                    </div>
                  ) : reminders.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell size={32} className="mx-auto text-(--color-foreground-muted) opacity-30 mb-2" />
                      <p className="text-sm text-(--color-foreground-muted)">No reminders</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {reminders.map((reminder) => (
                        <div key={reminder.id} className="p-4 hover:bg-(--color-background-muted) transition-colors cursor-pointer" onClick={() => navigate('/app/maintenance')}>
                          <div className="flex items-start gap-3">
                            <Clock size={16} className="text-orange-500 mt-1 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-gray-900 truncate">
                                {reminder.title}
                              </h4>
                              {reminder.description && (
                                <p className="text-xs text-(--color-foreground-muted) mt-1 line-clamp-2">
                                  {reminder.description}
                                </p>
                              )}
                              {reminder.dueDate && (
                                <p className="text-xs text-(--color-foreground-muted) mt-1">
                                  Due: {new Date(reminder.dueDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {reminders.length > 0 && (
                  <div className="border-t border-(--color-border) p-3">
                    <button
                      onClick={() => navigate('/app/maintenance')}
                      className="w-full text-center text-sm text-(--color-primary) font-medium hover:text-opacity-80 transition-opacity py-2"
                    >
                      View All Reminders
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-3 ml-2 border-l border-(--color-border) pl-4 hover:opacity-80 transition-opacity cursor-pointer">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold leading-none">{user?.name || "User"}</p>
                    <p className="text-xs text-(--color-foreground-muted) mt-1">{roleConfig.label}</p>
                  </div>
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border", roleConfig.color)}>
                    <RoleIcon size={20} />
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="end">
                <div className="p-5 border-b border-(--color-border)">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center border-2", roleConfig.color)}>
                      <RoleIcon size={22} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{user?.name || "User"}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{user?.email || "Not available"}</p>
                    </div>
                  </div>
                  <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider", roleConfig.color)}>
                    <RoleIcon size={12} />
                    {roleConfig.label}
                  </span>
                </div>
                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 text-sm font-medium text-red-600 transition-colors mt-1"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-64 h-full bg-(--color-background) p-4"
            >
              <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-8 h-8 rounded-lg bg-(--color-primary) flex items-center justify-center text-white font-bold">
                  F
                </div>
                <span className="font-bold text-xl tracking-tight">FleetPro</span>
              </div>
              {/* Mobile Role Badge */}
              <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider mb-4", roleConfig.color)}>
                <RoleIcon size={14} />
                {roleConfig.label}
              </div>
              <nav className="space-y-2">
                {filteredNav.map((item, idx) => (
                  item.children ? (
                    <div key={idx} className="pt-4">
                      <h3 className="text-xs font-semibold text-(--color-foreground-muted) uppercase tracking-wider px-2 mb-2">
                        {item.label}
                      </h3>
                      {item.children.map((child) => (
                        <NavItemComponent key={child.path} icon={child.icon} label={child.label} path={child.path!} />
                      ))}
                    </div>
                  ) : (
                    <NavItemComponent key={item.path} icon={item.icon!} label={item.label} path={item.path!} />
                  )
                ))}
              </nav>
              <div className="mt-6 border-t border-(--color-border) pt-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                >
                  <LogOut size={20} />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Widget */}
      <FloatingChatWidget />
    </div>
  );
}

function NavItemComponent({ icon: Icon, label, path, collapsed = false }: { icon: any, label: string, path: string, collapsed?: boolean }) {
  return (
    <NavLink
      to={path}
      end={path === "/app"}
      className={({ isActive }: { isActive: boolean }) => cn(
        "flex items-center gap-3 p-2 rounded-lg transition-all",
        isActive
          ? "bg-(--color-primary-muted) text-(--color-primary) font-semibold"
          : "hover:bg-(--color-background-muted) text-(--color-foreground-muted)"
      )}
    >
      <Icon size={20} className="shrink-0" />
      {!collapsed && <span className="text-sm">{label}</span>}
    </NavLink>
  );
}
