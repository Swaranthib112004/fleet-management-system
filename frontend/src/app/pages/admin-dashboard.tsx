import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./../lib/auth";
import { vehiclesApi, driversApi, maintenanceApi, routesApi, auditApi, dashboardApi, remindersApi } from "../lib/api";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Truck, Users, Wrench, Map, Shield, Settings, FileText, BarChart3,
  AlertTriangle, CheckCircle2, Clock, Activity, ArrowUpRight, Bell,
  UserPlus, TrendingUp, Eye, ChevronRight, Database, Server,
  Fuel, Route, MapPin, Zap
} from "lucide-react";
import { cn } from "../lib/utils";

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [vehicleCount, setVehicleCount] = React.useState(0);
  const [driverCount, setDriverCount] = React.useState(0);
  const [maintenanceItems, setMaintenanceItems] = React.useState<any[]>([]);
  const [routes, setRoutes] = React.useState<any[]>([]);
  const [reminders, setReminders] = React.useState<any[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<any[]>([]);
  const [overviewStats, setOverviewStats] = React.useState({
    totalVehicles: 0,
    activeDrivers: 0,
    pendingService: 0,
    activeRoutes: 0,
  });
  const [loading, setLoading] = React.useState(true);

  /**
   * Load data for the dashboard.
   * - Uses summary endpoint to ensure counts match the overview API.
   * - Also fetches raw items for more detailed widgets.
   */
  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [vResp, dResp, mResp, rResp, aResp, remResp, overviewResp] = await Promise.allSettled([
          vehiclesApi.getAll(),
          driversApi.getAll(),
          maintenanceApi.getAll(),
          routesApi.getAll(),
          auditApi.getAll(),
          remindersApi.getAll(),
          dashboardApi.getOverview(),
        ]);

        if (vResp.status === "fulfilled") {
          const v = vResp.value as any;
          setVehicleCount(v?.vehicles?.length ?? v?.length ?? 0);
        }
        if (dResp.status === "fulfilled") {
          const d = dResp.value as any;
          setDriverCount(d?.drivers?.length ?? d?.length ?? 0);
        }
        if (mResp.status === "fulfilled") {
          const m = mResp.value as any;
          setMaintenanceItems(m?.items || m || []);
        }
        if (rResp.status === "fulfilled") {
          const r = rResp.value as any;
          // backend may return { success, data, pagination } or an array
          setRoutes(r?.data || r?.routes || (Array.isArray(r) ? r : []));
        }
        if (aResp.status === "fulfilled") {
          const a = aResp.value as any;
          setAuditLogs(Array.isArray(a) ? a.slice(0, 8) : []);
        }
        if (remResp.status === "fulfilled") {
          const rem = remResp.value as any;
          setReminders(Array.isArray(rem) ? rem : (rem?.reminders || []));
        }

        if (overviewResp.status === "fulfilled") {
          const overview = overviewResp.value as any;
          const o = overview?.stats?.reduce(
            (acc: any, item: any) => {
              switch (item.label) {
                case "Total Vehicles":
                  acc.totalVehicles = Number(item.value) || 0;
                  break;
                case "Active Drivers":
                  acc.activeDrivers = Number(item.value) || 0;
                  break;
                case "Pending Service":
                  acc.pendingService = Number(item.value) || 0;
                  break;
                case "Active Routes":
                  acc.activeRoutes = Number(item.value) || 0;
                  break;
              }
              return acc;
            },
            {
              totalVehicles: 0,
              activeDrivers: 0,
              pendingService: 0,
              activeRoutes: 0,
            }
          );
          setOverviewStats(o);
        }
      } catch (err: any) {
        // Silently handle errors - fall back to empty data
        console.warn("Admin dashboard load error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    load();

    // Keep the dashboard in sync by polling the overview periodically
    const interval = setInterval(() => {
      dashboardApi.getOverview().then((res: any) => {
        const o = (res?.stats || []).reduce(
          (acc: any, item: any) => {
            switch (item.label) {
              case "Total Vehicles":
                acc.totalVehicles = Number(item.value) || 0;
                break;
              case "Active Drivers":
                acc.activeDrivers = Number(item.value) || 0;
                break;
              case "Pending Service":
                acc.pendingService = Number(item.value) || 0;
                break;
              case "Active Routes":
                acc.activeRoutes = Number(item.value) || 0;
                break;
            }
            return acc;
          },
          {
            totalVehicles: 0,
            activeDrivers: 0,
            pendingService: 0,
            activeRoutes: 0,
          }
        );
        setOverviewStats(o);
      }).catch(() => {
        // ignore polling errors
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const pendingMaintenance = overviewStats.pendingService || (Array.isArray(maintenanceItems)
    ? maintenanceItems.filter((m: any) => m.status !== "Completed").length
    : 0);
  const activeRoutes = overviewStats.activeRoutes || (Array.isArray(routes)
    ? routes.filter((r: any) => r.status === "active" || r.status === "planned").length
    : 0);
  const effectiveVehicleCount = overviewStats.totalVehicles || vehicleCount;
  const effectiveDriverCount = overviewStats.activeDrivers || driverCount;

  // Quick action cards for admin
  const quickActions = [
    { icon: Truck, label: "Manage Vehicles", desc: "Add, edit, delete fleet vehicles", path: "/app/fleet/vehicles", color: "from-blue-500 to-blue-700", count: effectiveVehicleCount },
    { icon: Users, label: "Manage Drivers", desc: "Driver assignments & profiles", path: "/app/fleet/drivers", color: "from-emerald-500 to-emerald-700", count: effectiveDriverCount },
    { icon: Wrench, label: "Maintenance", desc: "Schedule & track services", path: "/app/maintenance", color: "from-orange-500 to-orange-700", count: pendingMaintenance },
    { icon: Map, label: "Routes & Tracking", desc: "GPS tracking & route optimization", path: "/app/routing", color: "from-violet-500 to-violet-700", count: activeRoutes },
    { icon: BarChart3, label: "Analytics", desc: "Fleet performance insights", path: "/app/analytics", color: "from-pink-500 to-pink-700", count: null },
    { icon: FileText, label: "Documents", desc: "Insurance, licenses & reports", path: "/app/documents", color: "from-cyan-500 to-cyan-700", count: null },
    { icon: Settings, label: "System Settings", desc: "Roles, notifications & config", path: "/app/settings", color: "from-slate-500 to-slate-700", count: null },
    { icon: Shield, label: "Audit Logs", desc: "System activity & security", path: "/app/audit-logs", color: "from-rose-500 to-rose-700", count: auditLogs.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative space-y-8 p-1">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-blue-100/40 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-20 left-0 -ml-10 w-80 h-80 bg-indigo-50/40 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      {/* Admin Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-blue-600 flex items-center justify-center">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Admin <span className="text-blue-600">Control Center</span></h2>
            <p className="text-sm text-gray-500 font-medium">Full system access — manage all modules</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-white/80 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">System Live</span>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Vehicles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate("/app/fleet/vehicles")}
          className="group relative overflow-hidden bg-white/70 backdrop-blur-xl p-7 rounded-[2rem] border border-gray-200/60 shadow-sm hover:shadow-lg hover:bg-white/90 hover:border-blue-200/60 transition-all cursor-pointer"
        >
          {/* colored left accent bar */}
          <div className="absolute left-0 top-6 bottom-6 w-1 rounded-full bg-blue-500 opacity-80 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
          {/* Decorative background icon */}
          <div className="absolute top-2 right-3 opacity-[0.07] group-hover:opacity-[0.12] group-hover:scale-110 transition-all duration-500">
            <Truck size={110} className="text-blue-400" />
          </div>
          <div className="flex items-center gap-5 mb-5 relative z-10">
            {/* Logo-style Icon */}
            <div className="w-14 h-14 rounded-2xl border border-blue-100 bg-white text-blue-600 flex items-center justify-center group-hover:border-blue-300 group-hover:shadow-md transition-all shadow-sm">
              <div className="relative">
                <Truck size={26} strokeWidth={2.5} />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white shadow-sm" />
              </div>
            </div>
            <div>
              <h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.12em] mb-0.5">Total Vehicles</h3>
              <p className="text-4xl font-extrabold text-blue-600 leading-none tabular-nums tracking-tighter">{effectiveVehicleCount}</p>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-200/50 flex items-center justify-between text-sm relative z-10">
            <span className="text-gray-500 font-medium">View fleet details</span>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </div>
        </motion.div>

        {/* Drivers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigate("/app/fleet/drivers")}
          className="group relative overflow-hidden bg-white/70 backdrop-blur-xl p-7 rounded-[2rem] border border-gray-200/60 shadow-sm hover:shadow-lg hover:bg-white/90 hover:border-emerald-200/60 transition-all cursor-pointer"
        >
          {/* colored left accent bar */}
          <div className="absolute left-0 top-6 bottom-6 w-1 rounded-full bg-emerald-500 opacity-80 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-50/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
          {/* Decorative background icon */}
          <div className="absolute top-2 right-3 opacity-[0.07] group-hover:opacity-[0.12] group-hover:scale-110 transition-all duration-500">
            <Users size={110} className="text-emerald-400" />
          </div>
          <div className="flex items-center gap-5 mb-5 relative z-10">
            {/* Logo-style Icon */}
            <div className="w-14 h-14 rounded-2xl border border-emerald-100 bg-white text-emerald-600 flex items-center justify-center group-hover:border-emerald-300 group-hover:shadow-md transition-all shadow-sm">
              <div className="relative">
                <Users size={26} strokeWidth={2.5} />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
              </div>
            </div>
            <div>
              <h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.12em] mb-0.5">Active Drivers</h3>
              <p className="text-4xl font-extrabold text-emerald-600 leading-none tabular-nums tracking-tighter">{effectiveDriverCount}</p>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-200/50 flex items-center justify-between text-sm relative z-10">
            <span className="text-gray-500 font-medium">Manage personnel</span>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </div>
        </motion.div>

        {/* Reminders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ delay: 0.3 }}
          onClick={() => navigate("/app/maintenance")}
          className="group relative overflow-hidden bg-white/70 backdrop-blur-xl p-7 rounded-[2rem] border border-gray-200/60 shadow-sm hover:shadow-lg hover:bg-white/90 hover:border-amber-200/60 transition-all cursor-pointer"
        >
          {/* colored left accent bar */}
          <div className="absolute left-0 top-6 bottom-6 w-1 rounded-full bg-amber-500 opacity-80 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-50/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
          {/* Decorative background icon */}
          <div className="absolute top-2 right-3 opacity-[0.07] group-hover:opacity-[0.12] group-hover:scale-110 transition-all duration-500">
            <Bell size={110} className="text-amber-400" />
          </div>
          <div className="flex items-center gap-5 mb-5 relative z-10">
            {/* Logo-style Icon */}
            <div className="w-14 h-14 rounded-2xl border border-amber-100 bg-white text-amber-600 flex items-center justify-center group-hover:border-amber-300 group-hover:shadow-md transition-all shadow-sm">
              <div className="relative">
                <Bell size={26} strokeWidth={2.5} />
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white shadow-sm" />
              </div>
            </div>
            <div>
              <h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.12em] mb-0.5">Pending Reminders</h3>
              <p className="text-4xl font-extrabold text-amber-600 leading-none tabular-nums tracking-tighter">
                {reminders.filter(r => r.status === "pending").length}
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-200/50 flex items-center justify-between text-sm relative z-10">
            <span className="text-gray-500 font-medium">Address urgent items</span>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
          </div>
        </motion.div>
      </div>

      {/* Quick Access Module Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-white/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-gray-100/80 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
           <p className="text-[10px] font-black text-gray-400 upper-case tracking-[0.15em]">Management Hub</p>
           <div className="h-[1px] flex-1 bg-gray-100 ml-4 opacity-50"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -5, scale: 1.03 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              onClick={() => { navigate(action.path); }}
              className="group relative p-5 rounded-[1.5rem] border text-left flex flex-col gap-3 cursor-pointer transition-all bg-white/80 backdrop-blur-xl border-gray-200/60 shadow-sm hover:bg-white hover:border-blue-200 hover:shadow-md overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/0 via-white/40 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-sm", `bg-gradient-to-br ${action.color}`)}>
                <action.icon size={22} />
              </div>
              <div className="mt-1">
                <p className="text-sm font-extrabold text-gray-900 leading-tight">{action.label}</p>
                {action.count !== null ? (
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">{action.count} active items</p>
                ) : (
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">Global configuration</p>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* System Health & Audit Logs */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] text-gray-900 overflow-hidden relative border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 text-gray-400 transition-transform duration-700 group-hover:scale-110">
            <Server size={140} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-green-100">
                <Database size={20} className="text-green-600" />
              </div>
              <h3 className="text-lg font-extrabold">System Health</h3>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-200">
                All Systems Go
              </span>
              <span className="ml-auto text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">Healthy</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Vehicles", value: effectiveVehicleCount, icon: Truck, status: "Active", color: "group-hover:bg-blue-50 group-hover:text-blue-600" },
                { label: "Drivers", value: effectiveDriverCount, icon: Users, status: "Online", color: "group-hover:bg-emerald-50 group-hover:text-emerald-600" },
                { label: "Pending Jobs", value: pendingMaintenance, icon: Wrench, status: pendingMaintenance > 0 ? "Action Needed" : "Clear", color: "group-hover:bg-amber-50 group-hover:text-amber-600" },
                { label: "Active Routes", value: activeRoutes, icon: Route, status: "Tracking", color: "group-hover:bg-indigo-50 group-hover:text-indigo-600" },
              ].map((item) => (
                <div key={item.label} className={cn("group/card bg-gray-50/50 border border-gray-100 p-5 rounded-2xl hover:bg-white hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default")}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn("w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center transition-colors duration-300", item.color)}>
                      <item.icon size={16} />
                    </div>
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{item.label}</span>
                  </div>
                  <p className="text-3xl font-extrabold text-gray-900 tabular-nums">{item.value}</p>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-[0.12em] mt-1 block",
                    item.status === "Action Needed" ? "text-amber-500" : "text-emerald-500"
                  )}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Recent Audit Logs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden"
        >
          <div className="px-8 py-6 border-b border-gray-100/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Activity size={18} className="text-blue-600" />
              </div>
              <h3 className="font-extrabold text-gray-900">Recent Activity</h3>
            </div>
            <button
              onClick={() => { navigate("/app/audit-logs"); toast.info("Opening audit logs..."); }}
              className="text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
            >
              View All
            </button>
          </div>
          <div className="p-4 space-y-1 max-h-[340px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                  <Activity className="text-gray-300" size={32} />
                </div>
                <p className="text-sm font-bold text-gray-400">No activity logged yet.</p>
              </div>
            ) : (
              auditLogs.map((log: any, i: number) => {
                const who = typeof log.user === "object" ? (log.user?.name || log.user?.email || "System") : (log.name || log.email || "System");
                const when = log.createdAt ? new Date(log.createdAt).toLocaleString() : "";
                return (
                  <div key={log._id || log.id || i} className="group px-4 py-3 flex items-center gap-4 rounded-2xl hover:bg-white/80 transition-all cursor-pointer border border-transparent hover:border-gray-100">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-extrabold shrink-0 group-hover:bg-blue-100 transition-colors">
                      {who.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        <span className="font-extrabold">{who}</span> {log.action}
                      </p>
                      {log.target && <p className="text-[10px] text-blue-500 font-bold truncate">{log.target}</p>}
                    </div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">{when}</span>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
