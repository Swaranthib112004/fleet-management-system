import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./../lib/auth";
import { vehiclesApi, driversApi, maintenanceApi, routesApi, auditApi, dashboardApi } from "../lib/api";
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
  const [auditLogs, setAuditLogs] = React.useState<any[]>([]);
  const [overviewStats, setOverviewStats] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [vResp, dResp, mResp, rResp, aResp, oResp] = await Promise.allSettled([
          vehiclesApi.getAll(),
          driversApi.getAll(),
          maintenanceApi.getAll(),
          routesApi.getAll(),
          auditApi.getAll(),
          dashboardApi.getOverview(),
        ]);

        if (vResp.status === "fulfilled") {
          const v = vResp.value as any;
          // Use global total if available, else count results
          setVehicleCount(v?.globalStats?.total ?? v?.total ?? v?.vehicles?.length ?? v?.length ?? 0);
        }
        if (dResp.status === "fulfilled") {
          const d = dResp.value as any;
          setDriverCount(d?.total ?? d?.drivers?.length ?? d?.length ?? 0);
        }
        if (mResp.status === "fulfilled") {
          const m = mResp.value as any;
          setMaintenanceItems(m?.items || m || []);
        }
        if (rResp.status === "fulfilled") {
          const r = rResp.value as any;
          setRoutes(r?.data || r?.routes || (Array.isArray(r) ? r : []));
        }
        if (aResp.status === "fulfilled") {
          const a = aResp.value as any;
          setAuditLogs(Array.isArray(a) ? a.slice(0, 8) : []);
        }
        if (oResp.status === "fulfilled") {
          const o = oResp.value as any;
          setOverviewStats(o.stats || []);
        }
      } catch (err: any) {
        console.warn("Admin dashboard load error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pendingMaintenance = Array.isArray(maintenanceItems)
    ? maintenanceItems.filter((m: any) => m.status !== "Completed").length
    : 0;
  const activeRoutes = Array.isArray(routes)
    ? routes.filter((r: any) => r.status === "active" || r.status === "planned").length
    : 0;

  // Quick action cards for admin
  const quickActions = [
    { icon: Truck, label: "Manage Vehicles", desc: "Add, edit, delete fleet vehicles", path: "/app/fleet/vehicles", color: "from-blue-500 to-blue-700", count: vehicleCount },
    { icon: Users, label: "Manage Drivers", desc: "Driver assignments & profiles", path: "/app/fleet/drivers", color: "from-emerald-500 to-emerald-700", count: driverCount },
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

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {quickActions.map((action, i) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => {
              navigate(action.path);
              toast.info(`Opening ${action.label}...`);
            }}
            className="group cursor-pointer relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-xl transition-all duration-300"
          >
            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br", action.color)} />
            <div className="relative p-6 group-hover:text-white transition-colors duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-white/20 flex items-center justify-center transition-colors duration-300">
                  <action.icon size={24} className="text-gray-600 group-hover:text-white transition-colors duration-300" />
                </div>
                {action.count !== null && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 group-hover:bg-white/20 group-hover:text-white transition-colors duration-300">
                    {action.count}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-gray-900 group-hover:text-white transition-colors duration-300 mb-1">{action.label}</h3>
              <p className="text-sm text-gray-500 group-hover:text-white/80 transition-colors duration-300">{action.desc}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-bold text-blue-600 group-hover:text-white/90 transition-colors duration-300">
                Open Module <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* System Health & Audit Logs */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
            <Server size={140} className="text-gray-900" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <Database size={20} className="text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">System Health</h3>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-100">
                All Systems Go
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  label: "Vehicles",
                  value: overviewStats.find(s => s.label === "Total Vehicles")?.value ?? vehicleCount,
                  icon: Truck,
                  status: "Active"
                },
                {
                  label: "Drivers",
                  value: overviewStats.find(s => s.label === "Active Drivers")?.value ?? driverCount,
                  icon: Users,
                  status: "Online"
                },
                {
                  label: "Pending Jobs",
                  value: overviewStats.find(s => s.label === "Pending Service")?.value ?? pendingMaintenance,
                  icon: Wrench,
                  status: (Number(overviewStats.find(s => s.label === "Pending Service")?.value) || pendingMaintenance) > 0 ? "Action Needed" : "Clear"
                },
                {
                  label: "Active Routes",
                  value: overviewStats.find(s => s.label === "Active Routes")?.value ?? activeRoutes,
                  icon: Map,
                  status: "Tracking"
                },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 border border-gray-100 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon size={16} className="text-gray-400" />
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{item.label}</span>
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900">{item.value}</p>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    item.status === "Action Needed" ? "text-amber-600" : "text-green-600"
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
