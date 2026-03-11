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
          vehiclesApi.getAll(),
          driversApi.getAll(),
          maintenanceApi.getAll(),
          routesApi.getAll(),
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
    <div className="relative min-h-screen space-y-8 p-1">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-20 left-0 -ml-20 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-blue-600 flex items-center justify-center">
            <Activity size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Fleet Intelligence <span className="text-blue-600">Hub</span></h2>
            <p className="text-sm text-gray-500 font-medium">Real-time performance metrics & operational insights</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 backdrop-blur-md border border-white/80 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">System Live</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Fleet Size", value: vehicles.length, icon: Truck, color: "text-blue-600 bg-blue-50/50", onClick: () => navigate("/app/fleet/vehicles") },
          { label: "On Road", value: activeVehicles, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50/50", onClick: () => navigate("/app/fleet/vehicles") },
          { label: "In Service", value: inMaintenance, icon: Wrench, color: "text-amber-600 bg-amber-50/50", onClick: () => navigate("/app/maintenance") },
          { label: "Operators", value: activeDrivers, icon: Users, color: "text-indigo-600 bg-indigo-50/50", onClick: () => navigate("/app/fleet/drivers") },
          { label: "Active Jobs", value: activeRoutes, icon: MapPin, color: "text-rose-600 bg-rose-50/50", onClick: () => navigate("/app/routing") },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -5, scale: 1.02 }}
            onClick={kpi.onClick}
            className="group relative bg-white/60 backdrop-blur-xl p-6 rounded-[1.5rem] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] hover:bg-white/80 hover:border-blue-100 transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300", kpi.color)}>
              <kpi.icon size={22} className="drop-shadow-sm" />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">{kpi.label}</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-1 tabular-nums tracking-tight">{kpi.value}</p>
            <div className="absolute bottom-4 right-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowUpRight size={18} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Analytics Content */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Performance Graph */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-3 bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)]"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Operational Utilization</h3>
              <p className="text-sm text-gray-500 font-medium">Mileage vs Maintenance Costs (Weekly)</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Distance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Costs</span>
              </div>
            </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="mgr_mileage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="mgr_cost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} dx={-10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    backdropFilter: "blur(12px)",
                    borderRadius: "16px",
                    border: "1px solid rgba(255, 255, 255, 0.8)",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    padding: "12px"
                  }}
                  itemStyle={{ fontWeight: "bold" }}
                />
                <Area type="monotone" dataKey="mileage" stroke="#2563eb" strokeWidth={4} fill="url(#mgr_mileage)" animationDuration={2000} />
                <Area type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={3} fill="url(#mgr_cost)" animationDuration={2500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Side Analytics Cards */}
        <div className="space-y-6">
          {/* Status Distribution */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)]"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-1">Fleet Health</h3>
            <p className="text-xs text-gray-500 font-medium mb-4 uppercase tracking-wider">Uptime Distribution</p>
            <div className="h-[160px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vehiclePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {vehiclePieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      backdropFilter: "blur(8px)",
                      borderRadius: "12px",
                      border: "none"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-gray-900">{vehicles.length}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Vehicles</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {vehiclePieData.map((item, idx) => (
                <div key={item.name} className="flex flex-col p-2 rounded-xl bg-gray-50/50 border border-gray-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[idx] }} />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{item.name}</span>
                  </div>
                  <span className="text-sm font-black text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* New Efficiency Widget */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-[2rem] text-white shadow-lg relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
              <Fuel size={80} />
            </div>
            <div className="relative z-10">
              <h4 className="font-bold text-sm uppercase tracking-widest opacity-80 mb-1">Efficiency Index</h4>
              <p className="text-3xl font-black mb-3">+12.4%</p>
              <div className="space-y-3">
                <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "85%" }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-white"
                  />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold opacity-70 uppercase">Target Reached</p>
                    <p className="text-xs font-bold leading-none">85.0 score</p>
                  </div>
                  <TrendingUp size={20} className="text-emerald-400" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modern Quick Operations Glass Panel */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            icon: Truck, title: "Asset Registry", desc: "Configuration & Specs",
            action: "Open Fleet", path: "/app/fleet/vehicles",
            glass: "bg-blue-500/10 text-blue-700 border-blue-200/50",
            iconBg: "bg-blue-500/20",
            stat: `${vehicles.length} Units`
          },
          {
            icon: Users, title: "Crew Management", desc: "Compliance & Safety",
            action: "Open Crew", path: "/app/fleet/drivers",
            glass: "bg-emerald-500/10 text-emerald-700 border-emerald-200/50",
            iconBg: "bg-emerald-500/20",
            stat: `${activeDrivers} Active`
          },
          {
            icon: Wrench, title: "Maintenance", desc: "Service & Diagnostics",
            action: "Open Shop", path: "/app/maintenance",
            glass: "bg-amber-500/10 text-amber-700 border-amber-200/50",
            iconBg: "bg-amber-500/20",
            stat: `${pendingMaintenance} Alerts`
          },
          {
            icon: Route, title: "Logistics Flow", desc: "Path Optimization",
            action: "Live Feed", path: "/app/routing",
            glass: "bg-indigo-500/10 text-indigo-700 border-indigo-200/50",
            iconBg: "bg-indigo-500/20",
            stat: `${activeRoutes} Routes`
          },
        ].map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 + i * 0.1 }}
            whileHover={{ y: -8, scale: 1.03 }}
            className={cn("backdrop-blur-xl p-6 rounded-[2rem] border shadow-sm cursor-pointer group flex flex-col justify-between transition-all", card.glass)}
            onClick={() => { navigate(card.path); toast.info(`Opening ${card.title}...`); }}
          >
            <div>
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform", card.iconBg)}>
                <card.icon size={24} />
              </div>
              <h4 className="font-extrabold text-lg mb-1">{card.title}</h4>
              <p className="text-xs font-semibold opacity-60 mb-6">{card.desc}</p>
            </div>
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-black/5">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50">{card.stat}</span>
              <div className="flex items-center gap-1 text-sm font-bold">
                {card.action} <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Activity Feeds */}
      <div className="grid lg:grid-cols-2 gap-6 pb-8">
        {/* Maintenance Log */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.1 }}
          className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden"
        >
          <div className="px-8 py-6 border-b border-gray-100/50 flex items-center justify-between">
            <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 rounded-lg"><Wrench size={18} className="text-amber-600" /></div>
              Upcoming Service
            </h3>
            <button
              onClick={() => navigate("/app/maintenance")}
              className="text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
            >
              Analyze All
            </button>
          </div>
          <div className="p-4 space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar">
            {maintenanceItems.length === 0 ? (
                <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                        <Wrench className="text-gray-300" size={32} />
                    </div>
                    <p className="text-sm font-bold text-gray-400">Stable Condition: No Urgent Alerts</p>
                </div>
            ) : (
              maintenanceItems.slice(0, 5).map((m: any, i: number) => (
                <div key={m._id || m.id || i} className="group px-4 py-4 rounded-2xl hover:bg-white/80 transition-all cursor-pointer border border-transparent hover:border-gray-100"
                  onClick={() => navigate("/app/maintenance")}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                            <Gauge size={20} />
                        </div>
                      <div>
                        <p className="text-sm font-extrabold text-gray-900">{m.type || "System Check"}</p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{m.notes?.slice(0, 30) || "Routine Diagnostics"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                        <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em]",
                            m.status === "Completed" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        )}>
                            {m.status || "Queued"}
                        </span>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 flex items-center justify-end gap-1">
                            <Calendar size={10} /> {new Date().toLocaleDateString()}
                        </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Dispatch Intel */}
        <motion.div
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 1.2 }}
           className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden"
        >
          <div className="px-8 py-6 border-b border-gray-100/50 flex items-center justify-between">
            <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 rounded-lg"><Route size={18} className="text-indigo-600" /></div>
              Dispatch Intelligence
            </h3>
            <button
               onClick={() => navigate("/app/routing")}
               className="text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
            >
              Monitor Flow
            </button>
          </div>
          <div className="p-4 space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar">
            {routes.length === 0 ? (
                <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                        <MapPin className="text-gray-300" size={32} />
                    </div>
                    <p className="text-sm font-bold text-gray-400">Idle Status: Ready for Dispatch</p>
                </div>
            ) : (
              routes.slice(0, 5).map((r: any, i: number) => (
                <div key={r._id || r.id || i} className="group px-4 py-4 rounded-2xl hover:bg-white/80 transition-all cursor-pointer border border-transparent hover:border-gray-100"
                  onClick={() => navigate("/app/routing")}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            <MapPin size={20} />
                        </div>
                      <div>
                        <p className="text-sm font-extrabold text-gray-900">{r.routeCode || "Express Dispatch"}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {r.startLocation?.name?.split(',')[0] || "Origin"} ➔ {r.endLocation?.name?.split(',')[0] || "Dest"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="h-1 w-12 bg-gray-100 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all duration-1000", r.status === 'active' ? "bg-emerald-500 w-1/2" : "bg-gray-300 w-full")}></div>
                        </div>
                        <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em]",
                            r.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600",
                        )}>
                            {r.status}
                        </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
