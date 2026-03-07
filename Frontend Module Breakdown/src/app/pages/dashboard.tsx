import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Truck,
  Users,
  Wrench,
  MapPin,
  Plus,
  ArrowUpRight,
  ChevronRight,
  Activity,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { vehiclesApi, driversApi, maintenanceApi, dashboardApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { AdminDashboard } from "./admin-dashboard";
import { ManagerDashboard } from "./manager-dashboard";
import { DriverDashboard } from "./driver-dashboard";
import { CustomerDashboard } from "./customer-dashboard";
import { toast } from "sonner";

// Role display names
const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  driver: "Driver",
  customer: "Customer"
};

// Role-specific greeting messages
const ROLE_GREETINGS: Record<string, string> = {
  admin: "Full system control. Manage every aspect of your fleet operations.",
  manager: "Fleet operations overview — manage vehicles, drivers & routes.",
  driver: "Here are your assignments and vehicle status for today.",
  customer: "Track your shipments and access your documents.",
};

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const userRole = user?.role || "driver";
  const userName = user?.name || ROLE_LABELS[userRole] || "User";

  const [vehicles, setVehicles] = React.useState<any[]>([]);
  const [drivers, setDrivers] = React.useState<any[]>([]);
  const [maintenance, setMaintenance] = React.useState<any[]>([]);
  const [stats, setStats] = React.useState<any[]>([]);
  const [chartData, setChartData] = React.useState<any[]>([]);
  const [activities, setActivities] = React.useState<any[]>([]);
  const [loadingData, setLoadingData] = React.useState(false);

  const STATS = stats;

  React.useEffect(() => {
    // Only fetch full overview data for admin and manager
    if (userRole !== "admin" && userRole !== "manager") return;

    const load = async () => {
      setLoadingData(true);
      try {
        const [vResp, dResp, mResp, overview, chart, acts] = await Promise.all([
          vehiclesApi.getAll({ limit: 100 }), // Fetch more for local filtering if needed
          driversApi.getAll({ limit: 100 }),
          maintenanceApi.getAll(),
          dashboardApi.getOverview(),
          dashboardApi.getChartData(),
          dashboardApi.getActivities(),
        ]);
        // unwrap pagination wrappers
        const vData = vResp as any;
        const dData = dResp as any;
        const mData = mResp as any;
        setVehicles(vData?.vehicles || (Array.isArray(vData) ? vData : []));
        setDrivers(dData?.drivers || (Array.isArray(dData) ? dData : []));
        setMaintenance(mData?.items || (Array.isArray(mData) ? mData : []));
        setStats(overview.stats || []);
        setChartData(chart);
        setActivities(acts);
      } catch (err: any) {
        // Silently handle errors - fall back to empty data
        console.warn("Dashboard load error:", err.message);
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [userRole]);

  // ----- Driver-only dashboard ------
  if (userRole === "driver") {
    return (
      <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Driver Dashboard</h1>
            <p className="text-gray-500 font-medium">Welcome back, {userName}. {ROLE_GREETINGS.driver}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-4 py-2 rounded-xl bg-green-50 text-green-600 font-bold text-sm border border-green-200 flex items-center gap-2">
              <Truck size={16} /> Driver Mode
            </span>
          </div>
        </motion.div>
        <DriverDashboard />
      </div>
    );
  }

  // ----- Customer-only dashboard ------
  if (userRole === "customer") {
    return (
      <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Customer Portal</h1>
            <p className="text-gray-500 font-medium">Welcome, {userName}. {ROLE_GREETINGS.customer}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-4 py-2 rounded-xl bg-purple-50 text-purple-600 font-bold text-sm border border-purple-200 flex items-center gap-2">
              <Users size={16} /> Customer Portal
            </span>
          </div>
        </motion.div>
        <CustomerDashboard />
      </div>
    );
  }

  // ----- Admin & Manager full dashboard ------
  // For Manager: show only manager-specific view (Operations Center)
  if (userRole === "manager") {
    return (
      <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Fleet Operations</h1>
            <p className="text-gray-500 font-medium">Welcome back, {userName}. {ROLE_GREETINGS.manager}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/app/analytics")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Calendar size={18} />
              Last 7 Days
            </button>
            <button
              onClick={() => { navigate("/app/fleet/vehicles"); toast.info("Opening vehicles..."); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
            >
              <Plus size={18} />
              Add Vehicle
            </button>
          </div>
        </motion.div>

        {/* Manager-specific operations dashboard */}
        <ManagerDashboard />
      </div>
    );
  }

  // ----- Admin full dashboard with all modules ------
  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Fleet Overview</h1>
          <p className="text-gray-500 font-medium">Welcome back, {userName}. {ROLE_GREETINGS.admin}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/app/analytics")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <Calendar size={18} />
            Last 7 Days
          </button>
          <button
            onClick={() => { navigate("/app/fleet/vehicles"); toast.info("Opening vehicles..."); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
          >
            <Plus size={18} />
            Add Asset
          </button>
        </div>
      </motion.div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS.map((stat, i) => {
          const iconMap: Record<string, React.FC<any>> = {
            "Total Vehicles": Truck,
            "Active Drivers": Users,
            "Pending Service": Wrench,
            "Active Routes": MapPin,
          };
          const IconComponent = iconMap[stat.label] || Truck;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group cursor-pointer"
              onClick={() => {
                if (stat.color === "blue") { navigate("/app/fleet/vehicles"); toast.info("Opening vehicles..."); }
                else if (stat.color === "green") { navigate("/app/fleet/drivers"); toast.info("Opening drivers..."); }
                else if (stat.color === "orange") { navigate("/app/maintenance"); toast.info("Opening maintenance..."); }
                else { navigate("/app/routing"); toast.info("Opening routing..."); }
              }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={cn(
                  "p-3 rounded-xl",
                  stat.color === "blue" && "bg-blue-50 text-blue-600",
                  stat.color === "green" && "bg-green-50 text-green-600",
                  stat.color === "orange" && "bg-orange-50 text-orange-600",
                  stat.color === "purple" && "bg-purple-50 text-purple-600",
                )}>
                  <IconComponent size={24} />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-sm font-bold",
                  stat.trend === "up" ? "text-green-600" : "text-red-600"
                )}>
                  {stat.trend === "up" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {stat.change}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider leading-none mb-2">{stat.label}</p>
                <h3 className="text-3xl font-extrabold text-gray-900 leading-none">{stat.value}</h3>
              </div>
              <div className="mt-3 text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                View Details <ArrowUpRight size={12} />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Fleet Utilization</h3>
                <p className="text-sm text-gray-500 font-medium">Distance traveled vs Operational costs</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600" />
                  <span className="text-xs font-bold text-gray-600">Mileage (mi)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-200" />
                  <span className="text-xs font-bold text-gray-600">Cost ($)</span>
                </div>
              </div>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorMileage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                  <Area type="monotone" dataKey="mileage" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorMileage)" />
                  <Area type="monotone" dataKey="cost" stroke="#94a3b8" strokeWidth={2} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Predictive Dashboard Snippet */}
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
              <Activity size={120} className="text-gray-900" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Predictive Alerts</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl">
                  <p className="text-indigo-600 text-sm font-bold uppercase tracking-wider mb-1">Upcoming Service</p>
                  <p className="text-2xl font-extrabold text-gray-900 mb-4">{maintenance.filter((m) => m.status === "Scheduled").length} Vehicles</p>
                  <div className="w-full bg-indigo-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full w-[85%] rounded-full" />
                  </div>
                  <p className="text-xs text-indigo-500 mt-2 font-bold uppercase tracking-tighter">Confidence Score: 85%</p>
                </div>
                <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl">
                  <p className="text-indigo-600 text-sm font-bold uppercase tracking-wider mb-1">Brake Wear Risk</p>
                  <p className="text-2xl font-extrabold text-gray-900 mb-4">TR-9902 Alert</p>
                  <button
                    onClick={() => {
                      navigate("/app/maintenance");
                      toast.info("Redirecting to maintenance...");
                    }}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 group"
                  >
                    Schedule Maintenance <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Analytics/Activity */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900">Recent Activity</h3>
              <button
                onClick={() => { navigate("/app/settings"); toast.info("Opening audit logs..."); }}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                View All
              </button>
            </div>
            <div className="space-y-6">
              {activities.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No recent activity yet.</p>
              ) : (
                activities.map((activity) => {
                  const userLabel = activity.user?.name || activity.user?.email || 'Unknown';
                  const timeLabel = activity.createdAt ? new Date(activity.createdAt).toLocaleString() : '';
                  return (
                    <div key={activity._id || activity.id} className="flex gap-4 group">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 group-last:border-transparent">
                          <Users size={18} className="text-gray-400" />
                        </div>
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gray-100 group-last:hidden" />
                      </div>
                      <div className="pb-6">
                        <p className="text-sm font-medium text-gray-900">
                          <span className="font-bold">{userLabel}</span> {activity.action}
                        </p>
                        <p className="text-xs font-bold text-blue-600 mt-0.5">{activity.target}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{timeLabel}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-200">
            <h3 className="font-bold text-xl mb-2">Fleet Pro Tip</h3>
            <p className="text-blue-100 text-sm leading-relaxed mb-6">
              Optimizing your "Route 12" could save you roughly 14% on fuel costs this week based on traffic patterns.
            </p>
            <button
              onClick={() => {
                navigate("/app/routing");
                toast.success("Opening route optimizer...");
              }}
              className="w-full py-3 rounded-xl bg-white text-blue-600 font-bold hover:bg-blue-50 transition-all shadow-lg"
            >
              Optimize Now
            </button>
          </div>
        </div>
      </div>

      {/* Admin-specific panel */}
      <AdminDashboard />
    </div>
  );
}
