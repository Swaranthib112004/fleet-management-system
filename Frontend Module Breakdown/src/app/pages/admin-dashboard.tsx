import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./../lib/auth";
import { vehiclesApi, driversApi, maintenanceApi, routesApi, auditApi, dashboardApi, remindersApi } from "../lib/api";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Truck, Users, Wrench, Map, Shield, Settings, FileText, BarChart3,
  AlertTriangle, CheckCircle2, Clock, Activity, ArrowUpRight,
  UserPlus, TrendingUp, Eye, ChevronRight, Database, Server
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
    { icon: Shield, label: "Audit Logs", desc: "System activity & security", path: "/app/settings", color: "from-rose-500 to-rose-700", count: auditLogs.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Admin Section Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
          <Shield size={22} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Admin Control Center</h2>
          <p className="text-sm text-gray-500">Full system access — manage all modules</p>
        </div>
      </div>

      {/* Top Main Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Vehicles */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           onClick={() => navigate("/app/fleet/vehicles")}
           className="relative overflow-hidden bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all duration-300 cursor-pointer group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
            <Truck size={100} />
          </div>
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck size={24} />
            </div>
            <div>
              <h3 className="text-gray-500 font-medium text-sm">Total Vehicles</h3>
              <p className="text-3xl font-extrabold text-gray-900 leading-none">{effectiveVehicleCount}</p>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-sm relative z-10">
            <span className="text-gray-500">View fleet details</span>
            <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </div>
        </motion.div>

        {/* Drivers */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           onClick={() => navigate("/app/fleet/drivers")}
           className="relative overflow-hidden bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all duration-300 cursor-pointer group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
            <Users size={100} />
          </div>
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-gray-500 font-medium text-sm">Active Drivers</h3>
              <p className="text-3xl font-extrabold text-gray-900 leading-none">{effectiveDriverCount}</p>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-sm relative z-10">
            <span className="text-gray-500">Manage personnel</span>
            <ChevronRight size={16} className="text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </div>
        </motion.div>

        {/* Reminders */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
           onClick={() => navigate("/app/maintenance")}
           className="relative overflow-hidden bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all duration-300 cursor-pointer group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:scale-110 transition-transform duration-500">
            <AlertTriangle size={100} />
          </div>
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-gray-500 font-medium text-sm">Pending Reminders</h3>
              <p className="text-3xl font-extrabold text-gray-900 leading-none">
                {reminders.filter(r => r.status === "pending").length}
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-sm relative z-10">
            <span className="text-gray-500">Address urgent items</span>
            <ChevronRight size={16} className="text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
          </div>
        </motion.div>

      </div>

      {/* System Health & Audit Logs */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-8 rounded-[2rem] text-gray-900 overflow-hidden relative border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all duration-300 group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 text-gray-200 transition-transform duration-500 group-hover:scale-105">
            <Server size={140} />
          </div>
          <div className="absolute top-6 right-6 bg-white shadow-sm border border-gray-100 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full z-20 transition-colors duration-300 group-hover:text-green-600 group-hover:border-green-200 group-hover:bg-green-50">
            Healthy
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Database size={20} className="text-green-400" />
              </div>
              <h3 className="text-lg font-bold">System Health</h3>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                All Systems Go
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Vehicles", value: effectiveVehicleCount, icon: Truck, status: "Active" },
                { label: "Drivers", value: effectiveDriverCount, icon: Users, status: "Online" },
                { label: "Pending Jobs", value: pendingMaintenance, icon: Wrench, status: pendingMaintenance > 0 ? "Action Needed" : "Clear" },
                { label: "Active Routes", value: activeRoutes, icon: Map, status: "Tracking" },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 border border-gray-200 p-4 rounded-xl hover:bg-white hover:shadow-lg hover:border-gray-300 hover:-translate-y-1 transition-all duration-300 group cursor-default">
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
                    <span className="text-xs text-gray-500 font-medium group-hover:text-gray-700 transition-colors duration-300">{item.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">{item.value}</p>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider transition-colors duration-300",
                    item.status === "Action Needed" ? "text-amber-500" : "text-green-500"
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
          className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity size={20} className="text-gray-500" />
              <h3 className="font-bold text-gray-900">Recent Activity</h3>
            </div>
            <button
              onClick={() => { navigate("/app/settings"); toast.info("Opening audit logs..."); }}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-gray-50 max-h-[340px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400 text-sm font-medium">
                No recent activity logged yet.
                <br />
                <span className="text-xs">Actions performed in the system will appear here.</span>
              </div>
            ) : (
              auditLogs.map((log: any, i: number) => {
                const who = typeof log.user === "object" ? (log.user?.name || log.user?.email || "System") : (log.name || log.email || "System");
                const when = log.createdAt ? new Date(log.createdAt).toLocaleString() : "";
                return (
                  <div key={log._id || log.id || i} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {who.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        <span className="font-bold">{who}</span> {log.action}
                      </p>
                      {log.target && <p className="text-xs text-blue-600 font-bold truncate">{log.target}</p>}
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">{when}</span>
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
