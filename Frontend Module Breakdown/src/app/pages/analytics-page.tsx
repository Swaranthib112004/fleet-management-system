import React from "react";
import { useNavigate } from "react-router-dom";
import {
   BarChart3, TrendingUp, TrendingDown, DollarSign, Fuel, Gauge, MapPin,
   Download, Calendar, Filter, CheckCircle2, Truck, Users, Wrench,
   ArrowUpRight, Activity, Target, Percent
} from "lucide-react";
import {
   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
   LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import { motion } from "motion/react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { dashboardApi } from "../lib/api";

const PIE_COLORS = ["#2563eb", "#34d399", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4"];

export function AnalyticsPage() {
   const navigate = useNavigate();
   const [dateRange, setDateRange] = React.useState("30d");
   const [analytics, setAnalytics] = React.useState<any>(null);
   const [chartData, setChartData] = React.useState<any[]>([]);
   const [pieData, setPieData] = React.useState<any[]>([]);
   const [loading, setLoading] = React.useState(true);

   React.useEffect(() => {
      const load = async () => {
         setLoading(true);
         try {
            const [analyticsResp, chart, pie] = await Promise.all([
               dashboardApi.getAnalytics(),
               dashboardApi.getChartData(),
               dashboardApi.getPieData(),
            ]);
            setAnalytics(analyticsResp);
            setChartData(chart);
            setPieData(pie);
         } catch (err: any) {
            console.warn("Failed to load analytics:", err.message);
            // Silently fall back to empty data
         } finally {
            setLoading(false);
         }
      };
      load();
   }, []);

   if (loading) {
      return (
         <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
               <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
               <p className="text-gray-500 font-medium">Loading analytics...</p>
            </div>
         </div>
      );
   }

   const fleet = analytics?.fleet || {};
   const drivers = analytics?.drivers || {};
   const maintenance = analytics?.maintenance || {};
   const routes = analytics?.routes || {};
   const monthlyData = analytics?.monthlyData || [];

   const kpis = [
      { label: "Fleet Utilization", value: `${fleet.utilization || 0}%`, change: `${fleet.activeVehicles || 0} active`, trend: "up", icon: Truck, color: "blue" },
      { label: "Driver Usage", value: `${drivers.utilization || 0}%`, change: `${drivers.activeDrivers || 0} active`, trend: "up", icon: Users, color: "green" },
      { label: "Service Completion", value: `${maintenance.completionRate || 0}%`, change: `${maintenance.pending || 0} pending`, trend: maintenance.pending > 0 ? "down" : "up", icon: Wrench, color: "orange" },
      { label: "Total Cost", value: `₹${(maintenance.totalCost || 0).toLocaleString()}`, change: `Avg ₹${maintenance.avgCost || 0}`, trend: "up", icon: DollarSign, color: "purple" },
   ];

   return (
      <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
         {/* Header */}
         <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4"
         >
            <div>
               <h1 className="text-3xl font-bold tracking-tight text-gray-900">Advanced Analytics</h1>
               <p className="text-gray-500 font-medium">Data-driven insights to optimize your logistics operations.</p>
            </div>
            <div className="flex items-center gap-3">
               <div className="flex bg-gray-100 p-1 rounded-xl">
                  {[
                     { label: "7 Days", value: "7d" },
                     { label: "30 Days", value: "30d" },
                     { label: "90 Days", value: "90d" },
                  ].map(({ label, value }) => (
                     <button
                        key={value}
                        onClick={() => { setDateRange(value); toast.info(`Showing ${label} data`); }}
                        className={cn(
                           "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                           dateRange === value ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                     >
                        {label}
                     </button>
                  ))}
               </div>
               <button
                  onClick={() => {
                     toast.success("Preparing PDF report...", { duration: 2000 });
                     setTimeout(() => window.print(), 800);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 print:hidden"
               >
                  <Download size={18} />
                  Download PDF
               </button>
            </div>
         </motion.div>

         {/* KPI Cards */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, i) => (
               <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => {
                     if (kpi.color === "blue") navigate("/app/fleet/vehicles");
                     else if (kpi.color === "green") navigate("/app/fleet/drivers");
                     else if (kpi.color === "orange") navigate("/app/maintenance");
                     else navigate("/app/routing");
                     toast.info(`Opening ${kpi.label} details...`);
                  }}
               >
                  <div className="flex justify-between items-start mb-4">
                     <div className={cn("p-3 rounded-xl",
                        kpi.color === "blue" ? "bg-blue-50 text-blue-600" :
                           kpi.color === "green" ? "bg-green-50 text-green-600" :
                              kpi.color === "orange" ? "bg-orange-50 text-orange-600" :
                                 "bg-purple-50 text-purple-600"
                     )}>
                        <kpi.icon size={24} />
                     </div>
                     <div className={cn("text-xs font-bold px-2 py-1 rounded-full",
                        kpi.trend === "up" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                     )}>
                        {kpi.change}
                     </div>
                  </div>
                  <div>
                     <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                     <h3 className="text-3xl font-extrabold text-gray-900">{kpi.value}</h3>
                  </div>
                  <div className="mt-3 text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                     View Details <ArrowUpRight size={12} />
                  </div>
               </motion.div>
            ))}
         </div>

         {/* Utilization Gauges */}
         <div className="grid md:grid-cols-3 gap-6">
            {[
               { label: "Fleet Utilization", value: fleet.utilization || 0, total: fleet.totalVehicles || 0, active: fleet.activeVehicles || 0, color: "#2563eb" },
               { label: "Driver Utilization", value: drivers.utilization || 0, total: drivers.totalDrivers || 0, active: drivers.activeDrivers || 0, color: "#10b981" },
               { label: "Service Completion", value: maintenance.completionRate || 0, total: maintenance.total || 0, active: maintenance.completed || 0, color: "#f59e0b" },
            ].map((gauge, i) => (
               <motion.div
                  key={gauge.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm"
               >
                  <h4 className="font-bold text-gray-900 mb-4">{gauge.label}</h4>
                  <div className="flex items-center gap-6">
                     <div className="relative w-24 h-24">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                           <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                           <circle
                              cx="50" cy="50" r="40"
                              fill="none"
                              stroke={gauge.color}
                              strokeWidth="10"
                              strokeDasharray={`${gauge.value * 2.51} 251`}
                              strokeLinecap="round"
                           />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                           <span className="text-xl font-extrabold text-gray-900">{gauge.value}%</span>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: gauge.color }} />
                           <span className="text-sm text-gray-600">Active: <b>{gauge.active}</b></span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-gray-300" />
                           <span className="text-sm text-gray-600">Total: <b>{gauge.total}</b></span>
                        </div>
                     </div>
                  </div>
               </motion.div>
            ))}
         </div>

         {/* Charts Row */}
         <div className="grid lg:grid-cols-2 gap-8">
            {/* Fuel/Mileage Trends */}
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.5 }}
               className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm"
            >
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold">Weekly Performance</h3>
                  <div className="flex items-center gap-4 text-xs font-bold">
                     <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600" /> Mileage</span>
                     <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Cost</span>
                  </div>
               </div>
               <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData}>
                        <defs>
                           <linearGradient id="anl_mileage" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                           </linearGradient>
                           <linearGradient id="anl_cost" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                        <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                        <Area type="monotone" dataKey="mileage" stroke="#2563eb" strokeWidth={3} fill="url(#anl_mileage)" />
                        <Area type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} fill="url(#anl_cost)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </motion.div>

            {/* Asset Distribution Pie */}
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.6 }}
               className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm"
            >
               <h3 className="text-xl font-bold mb-8">Asset Distribution</h3>
               <div className="h-[320px] flex items-center justify-center gap-8">
                  <ResponsiveContainer width="55%" height="100%">
                     <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value">
                           {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
                           ))}
                        </Pie>
                        <Tooltip />
                     </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-4">
                     {pieData.map((d, i) => (
                        <div key={i} className="flex items-center gap-3">
                           <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color || PIE_COLORS[i % PIE_COLORS.length] }} />
                           <div>
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider leading-none mb-1">{d.name}</p>
                              <p className="text-sm font-bold text-gray-900">{d.value} units</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </motion.div>
         </div>

         {/* Monthly Cost & Maintenance Trend */}
         {monthlyData.length > 0 && (
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.7 }}
               className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm"
            >
               <div className="flex items-center justify-between mb-8">
                  <div>
                     <h3 className="text-xl font-bold">Monthly Maintenance Cost</h3>
                     <p className="text-sm text-gray-500">Track your service expenses over time</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold">
                     <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600" /> Cost (₹)</span>
                     <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" /> Count</span>
                  </div>
               </div>
               <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                        <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                        <Bar dataKey="cost" fill="#2563eb" radius={[8, 8, 0, 0]} barSize={40} />
                        <Bar dataKey="count" fill="#f59e0b" radius={[8, 8, 0, 0]} barSize={40} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </motion.div>
         )}

         {/* Summary Cards */}
         <div className="grid md:grid-cols-3 gap-6">
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.8 }}
               className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[2rem] text-white shadow-xl shadow-blue-200 cursor-pointer hover:shadow-2xl transition-shadow"
               onClick={() => { navigate("/app/fleet/vehicles"); toast.info("Opening vehicles..."); }}
            >
               <Truck size={28} className="mb-3 opacity-60" />
               <h3 className="font-bold text-lg mb-1">Fleet Summary</h3>
               <p className="text-blue-100 text-sm mb-4">{fleet.totalVehicles || 0} vehicles total, {fleet.activeVehicles || 0} active</p>
               <span className="text-sm font-bold flex items-center gap-1">Manage Fleet <ArrowUpRight size={14} /></span>
            </motion.div>

            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.85 }}
               className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-[2rem] text-white shadow-xl shadow-emerald-200 cursor-pointer hover:shadow-2xl transition-shadow"
               onClick={() => { navigate("/app/fleet/drivers"); toast.info("Opening drivers..."); }}
            >
               <Users size={28} className="mb-3 opacity-60" />
               <h3 className="font-bold text-lg mb-1">Driver Summary</h3>
               <p className="text-emerald-100 text-sm mb-4">{drivers.totalDrivers || 0} drivers, {drivers.activeDrivers || 0} active</p>
               <span className="text-sm font-bold flex items-center gap-1">Manage Drivers <ArrowUpRight size={14} /></span>
            </motion.div>

            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.9 }}
               className="bg-gradient-to-br from-orange-500 to-amber-600 p-6 rounded-[2rem] text-white shadow-xl shadow-orange-200 cursor-pointer hover:shadow-2xl transition-shadow"
               onClick={() => { navigate("/app/maintenance"); toast.info("Opening maintenance..."); }}
            >
               <Wrench size={28} className="mb-3 opacity-60" />
               <h3 className="font-bold text-lg mb-1">Maintenance Summary</h3>
               <p className="text-orange-100 text-sm mb-4">{maintenance.total || 0} records, ₹{(maintenance.totalCost || 0).toLocaleString()} total cost</p>
               <span className="text-sm font-bold flex items-center gap-1">View Maintenance <ArrowUpRight size={14} /></span>
            </motion.div>
         </div>
      </div>
   );
}
