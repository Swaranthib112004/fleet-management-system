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

import { toast } from "sonner";

// Role display names
const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  driver: "Driver"
};

// Role-specific greeting messages
const ROLE_GREETINGS: Record<string, string> = {
  admin: "Full system control. Manage every aspect of your fleet operations.",
  driver: "Here are your assignments and vehicle status for today."
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

  // Only Admin dashboard (Admin-only system)
  return (
    <>
      <AdminDashboard />
    </>
  );
}
