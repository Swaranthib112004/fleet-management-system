import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./../lib/auth";
import { vehiclesApi, driversApi, maintenanceApi, routesApi, dashboardApi } from "../lib/api";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Truck, Users, Wrench, Map, UserCog, ArrowUpRight, CheckCircle2,
  Clock, AlertCircle, Activity, TrendingUp, BarChart3, Route,
  Fuel, Gauge, Calendar, ChevronRight, MapPin
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { cn } from "../lib/utils";

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444"];

export function ManagerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [vehicles, setVehicles] = React.useState<any[]>([]);
  const [drivers, setDrivers] = React.useState<any[]>([]);
  const [maintenanceItems, setMaintenanceItems] = React.useState<any[]>([]);
  const [routes, setRoutes] = React.useState<any[]>([]);
  const [chartData, setChartData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [vResp, dResp, mResp, rResp, cResp] = await Promise.allSettled([
          vehiclesApi.getAll({ limit: 1000 }),
          driversApi.getAll({ limit: 1000 }),
          maintenanceApi.getAll({ limit: 1000 }),
          routesApi.getAll({ limit: 1000 }),
          dashboardApi.getChartData(),
        ]);
        if (vResp.status === "fulfilled") {
          const v = vResp.value as any;
          setVehicles(v?.vehicles || (Array.isArray(v) ? v : []));
        }
        if (dResp.status === "fulfilled") {
          const d = dResp.value as any;
          setDrivers(d?.drivers || (Array.isArray(d) ? d : []));
        }
        if (mResp.status === "fulfilled") {
          const m = mResp.value as any;
          setMaintenanceItems(m?.items || (Array.isArray(m) ? m : []));
        }
        if (rResp.status === "fulfilled") {
          const r = rResp.value as any;
          // backend may return { success, data, pagination } or an array
          setRoutes(r?.data || r?.routes || (Array.isArray(r) ? r : []));
        }
        if (cResp.status === "fulfilled") {
          setChartData(cResp.value as any[] || []);
        }
      } catch (err: any) {
        // Silently handle errors - fall back to empty data
        console.warn("Dashboard load error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activeVehicles = vehicles.filter((v: any) => v.status === "active" || v.status === "Active").length;
  const inMaintenance = vehicles.filter((v: any) => v.status === "maintenance" || v.status === "Maintenance").length;
  const activeDrivers = drivers.filter((d: any) => d.status === "Active" || !d.status).length;
  const pendingMaintenance = maintenanceItems.filter((m: any) => m.status !== "Completed").length;
  const activeRoutes = routes.filter((r: any) => r.status === "active" || r.status === "planned").length;

  const vehiclePieData = [
    { name: "Active", value: activeVehicles || 1 },
    { name: "Maintenance", value: inMaintenance || 0 },
    { name: "Inactive", value: Math.max(0, vehicles.length - activeVehicles - inMaintenance) },
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
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
          <UserCog size={22} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Operations Center</h2>
          <p className="text-sm text-gray-500">Fleet operations overview — manage vehicles, drivers & routes</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Fleet", value: vehicles.length, icon: Truck, color: "text-blue-600 bg-blue-50", onClick: () => navigate("/app/fleet/vehicles") },
          { label: "Active Vehicles", value: activeVehicles, icon: CheckCircle2, color: "text-green-600 bg-green-50", onClick: () => navigate("/app/fleet/vehicles") },
          { label: "In Service", value: inMaintenance, icon: Wrench, color: "text-orange-600 bg-orange-50", onClick: () => navigate("/app/maintenance") },
          { label: "Active Drivers", value: activeDrivers, icon: Users, color: "text-violet-600 bg-violet-50", onClick: () => navigate("/app/fleet/drivers") },
          { label: "Active Routes", value: activeRoutes, icon: MapPin, color: "text-pink-600 bg-pink-50", onClick: () => navigate("/app/routing") },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={kpi.onClick}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", kpi.color)}>
              <kpi.icon size={20} />
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{kpi.label}</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{kpi.value}</p>
            <div className="mt-2 text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              View Details <ArrowUpRight size={12} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts + Operations Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Mileage Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Weekly Fleet Performance</h3>
              <p className="text-sm text-gray-500">Mileage and operating costs this week</p>
            </div>
            <button
              onClick={() => { navigate("/app/analytics"); toast.info("Opening analytics..."); }}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              Full Report <ChevronRight size={14} />
            </button>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="mgr_mileage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="mgr_cost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgb(0 0 0 / 0.1)" }} />
                <Area type="monotone" dataKey="mileage" stroke="#2563eb" strokeWidth={3} fill="url(#mgr_mileage)" />
                <Area type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} fill="url(#mgr_cost)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Fleet Status Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-2">Fleet Status</h3>
          <p className="text-sm text-gray-500 mb-4">Vehicle availability breakdown</p>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vehiclePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {vehiclePieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {vehiclePieData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx] }} />
                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Operations Panel */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            icon: Truck, title: "Fleet Vehicles", desc: "View & manage all vehicles in your fleet",
            action: "Manage Fleet", path: "/app/fleet/vehicles",
            gradient: "from-blue-600 to-indigo-600", stat: `${vehicles.length} total`
          },
          {
            icon: Users, title: "Driver Management", desc: "Assign drivers, check licenses & performance",
            action: "Manage Drivers", path: "/app/fleet/drivers",
            gradient: "from-emerald-600 to-teal-600", stat: `${activeDrivers} active`
          },
          {
            icon: Wrench, title: "Maintenance Queue", desc: "Schedule services & track pending repairs",
            action: "Open Maintenance", path: "/app/maintenance",
            gradient: "from-orange-500 to-amber-600", stat: `${pendingMaintenance} pending`
          },
          {
            icon: Map, title: "Route Operations", desc: "Track vehicles, optimize routes in real-time",
            action: "Open Routing", path: "/app/routing",
            gradient: "from-violet-600 to-purple-600", stat: `${activeRoutes} active`
          },
        ].map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.08 }}
            className={cn("bg-gradient-to-br text-white p-6 rounded-2xl shadow-lg cursor-pointer hover:scale-[1.02] transition-transform", card.gradient)}
            onClick={() => { navigate(card.path); toast.info(`Opening ${card.title}...`); }}
          >
            <card.icon size={28} className="mb-3 opacity-80" />
            <h4 className="font-bold text-lg mb-1">{card.title}</h4>
            <p className="text-sm text-white/70 mb-4">{card.desc}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">{card.stat}</span>
              <span className="text-sm font-bold flex items-center gap-1">
                {card.action} <ArrowUpRight size={14} />
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Maintenance & Routes */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Maintenance Records */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Wrench size={18} className="text-orange-500" /> Recent Maintenance
            </h3>
            <button
              onClick={() => navigate("/app/maintenance")}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-gray-50 max-h-[280px] overflow-y-auto">
            {maintenanceItems.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400 text-sm">
                No maintenance records yet.
                <button onClick={() => navigate("/app/maintenance")} className="block mt-2 text-blue-600 font-bold hover:underline mx-auto">
                  Create Service Request →
                </button>
              </div>
            ) : (
              maintenanceItems.slice(0, 6).map((m: any, i: number) => (
                <div key={m._id || m.id || i} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() => navigate("/app/maintenance")}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      m.status === "Completed" ? "bg-green-50 text-green-600" : m.type === "repair" ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
                    )}>
                      <Wrench size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 capitalize">{m.type || "Service"}</p>
                      <p className="text-xs text-gray-500">{m.notes || "No notes"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      m.status === "Completed" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600",
                    )}>
                      {m.status || "Pending"}
                    </span>
                    {m.cost && <p className="text-xs text-gray-500 mt-1">₹{m.cost}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Active Routes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <MapPin size={18} className="text-violet-500" /> Route Operations
            </h3>
            <button
              onClick={() => navigate("/app/routing")}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-gray-50 max-h-[280px] overflow-y-auto">
            {routes.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400 text-sm">
                No routes created yet.
                <button onClick={() => navigate("/app/routing")} className="block mt-2 text-blue-600 font-bold hover:underline mx-auto">
                  Create Route →
                </button>
              </div>
            ) : (
              routes.slice(0, 6).map((r: any, i: number) => (
                <div key={r._id || r.id || i} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() => navigate("/app/routing")}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      r.status === "active" ? "bg-green-50 text-green-600" : r.status === "completed" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"
                    )}>
                      <MapPin size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{r.routeCode || r.name || "Route"}</p>
                      <p className="text-xs text-gray-500">
                        {r.startLocation?.name || "Start"} → {r.endLocation?.name || "End"}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    r.status === "active" ? "bg-green-50 text-green-600" : r.status === "completed" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600",
                  )}>
                    {r.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
