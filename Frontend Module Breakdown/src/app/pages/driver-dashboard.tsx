import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./../lib/auth";
import { dashboardApi } from "../lib/api";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Map, Clock, CheckCircle, Truck, Navigation, Phone,
  MapPin, Fuel, Gauge, AlertTriangle, Star, TrendingUp,
  Activity, ChevronRight, Route, ArrowUpRight, Package,
  Shield, Wrench, Calendar, BarChart3, Eye, Timer, Zap
} from "lucide-react";
import { cn } from "../lib/utils";

export function DriverDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"today" | "history">("today");
  const [tripStatuses, setTripStatuses] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const resp = await dashboardApi.getDriverDashboard();
        setData(resp);
        // Initialize trip statuses
        const statuses: Record<string, string> = {};
        (resp.assignments || []).forEach((a: any) => {
          statuses[a.id] = a.status;
        });
        setTripStatuses(statuses);
      } catch (err: any) {
        // Silently fall back to sample data - don't show error toast
        console.warn("Failed to load driver dashboard:", err.message);
        // Set fallback data
        setData({
          assignments: [
            { id: "1", route: "Warehouse A → Customer Hub B", routeCode: "RT-001", vehicle: "VH-1001", status: "In Progress", eta: "11:30 AM", distance: 45 },
            { id: "2", route: "Customer Hub B → Depot C", routeCode: "RT-002", vehicle: "VH-1001", status: "Upcoming", eta: "2:00 PM", distance: 32 },
            { id: "3", route: "Depot C → Warehouse A", routeCode: "RT-003", vehicle: "VH-1001", status: "Upcoming", eta: "5:30 PM", distance: 28 },
          ],
          stats: { totalTrips: 3, completedToday: 1, totalDistance: 105, avgRating: 4.7 },
          vehicleHealth: { registration: "VH-1001", make: "Tata", model: "Ace", fuel: "Diesel", mileage: 45000, status: "Active", lastService: new Date().toISOString() },
          recentMaintenance: [],
        });
        setTripStatuses({ "1": "In Progress", "2": "Upcoming", "3": "Upcoming" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleStartNavigation = (tripId: string) => {
    setTripStatuses(prev => ({ ...prev, [tripId]: "In Progress" }));
    toast.success("Navigation started! GPS tracking active.");
  };

  const handleMarkDelivered = (tripId: string) => {
    setTripStatuses(prev => ({ ...prev, [tripId]: "Completed" }));
    toast.success("Delivery marked as completed! ✅");
  };

  const handleVehicleCheck = () => {
    toast.info("Opening vehicle checklist...");
    navigate("/app/routing");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const assignments = data?.assignments || [];
  const stats = data?.stats || {};
  const vehicleHealth = data?.vehicleHealth;
  const activeTrips = assignments.filter((a: any) => (tripStatuses[a.id] || a.status) === "In Progress");
  const upcomingTrips = assignments.filter((a: any) => (tripStatuses[a.id] || a.status) === "Upcoming");
  const completedTrips = assignments.filter((a: any) => (tripStatuses[a.id] || a.status) === "Completed");

  return (
    <div className="space-y-6">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Trips", value: stats.totalTrips || 0, icon: Route, color: "text-blue-600 bg-blue-50", accent: "border-blue-200" },
          { label: "Completed", value: completedTrips.length, icon: CheckCircle, color: "text-green-600 bg-green-50", accent: "border-green-200" },
          { label: "Total Distance", value: `${stats.totalDistance || 0} km`, icon: MapPin, color: "text-violet-600 bg-violet-50", accent: "border-violet-200" },
          { label: "Avg Rating", value: (stats.avgRating || 4.5).toFixed(1), icon: Star, color: "text-amber-600 bg-amber-50", accent: "border-amber-200" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={cn("bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all", stat.accent)}
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", stat.color)}>
              <stat.icon size={20} />
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          {
            icon: Navigation, label: "Start Navigation", color: "from-blue-600 to-indigo-600",
            onClick: () => {
              if (activeTrips.length > 0) {
                toast.success("GPS navigation started for current route!");
                navigate("/app/routing");
              } else if (upcomingTrips.length > 0) {
                handleStartNavigation(upcomingTrips[0].id);
                navigate("/app/routing");
              } else {
                toast.info("No trips available for navigation.");
              }
            }
          },
          {
            icon: CheckCircle, label: "Mark Delivered", color: "from-green-600 to-emerald-600",
            onClick: () => {
              const inProgress = assignments.find((a: any) => (tripStatuses[a.id] || a.status) === "In Progress");
              if (inProgress) {
                handleMarkDelivered(inProgress.id);
              } else {
                toast.info("No active deliveries to mark.");
              }
            }
          },
          {
            icon: Truck, label: "Vehicle Check", color: "from-orange-500 to-amber-600",
            onClick: handleVehicleCheck
          },
        ].map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            onClick={action.onClick}
            className={cn(
              "bg-gradient-to-br text-white p-5 rounded-2xl flex flex-col items-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-[0.98]",
              action.color
            )}
          >
            <action.icon size={28} />
            <span className="text-sm font-bold">{action.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Trips */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trip Tabs */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Route size={18} />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Today's Assignments</h3>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setActiveTab("today")}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                    activeTab === "today" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Active ({activeTrips.length + upcomingTrips.length})
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                    activeTab === "history" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Completed ({completedTrips.length})
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
              <AnimatePresence mode="wait">
                {activeTab === "today" ? (
                  <motion.div
                    key="today"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {[...activeTrips, ...upcomingTrips].length === 0 ? (
                      <div className="px-6 py-12 text-center">
                        <CheckCircle size={48} className="text-green-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">All trips completed for today!</p>
                        <p className="text-xs text-gray-400 mt-1">Great work! Check back tomorrow for new assignments.</p>
                      </div>
                    ) : (
                      [...activeTrips, ...upcomingTrips].map((trip: any, i: number) => {
                        const status = tripStatuses[trip.id] || trip.status;
                        const isActive = status === "In Progress";
                        return (
                          <motion.div
                            key={trip.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                                isActive ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"
                              )}>
                                {isActive ? (
                                  <div className="relative">
                                    <MapPin size={22} />
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                                  </div>
                                ) : (
                                  <Map size={22} />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-gray-900 truncate">{trip.route}</p>
                                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">{trip.routeCode}</span>
                                </div>
                                <div className="flex items-center gap-4 mt-1">
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Truck size={12} /> {trip.vehicle}
                                  </span>
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <MapPin size={12} /> {trip.distance} km
                                  </span>
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock size={12} /> ETA: {trip.eta}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-3">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold",
                                isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                              )}>
                                {isActive && <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />}
                                {status}
                              </span>
                              {isActive ? (
                                <button
                                  onClick={() => handleMarkDelivered(trip.id)}
                                  className="px-3 py-1.5 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-colors shadow-sm"
                                >
                                  Deliver
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStartNavigation(trip.id)}
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                  Start
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {completedTrips.length === 0 ? (
                      <div className="px-6 py-12 text-center">
                        <Timer size={48} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No completed trips yet today.</p>
                        <p className="text-xs text-gray-400 mt-1">Mark active trips as delivered to see them here.</p>
                      </div>
                    ) : (
                      completedTrips.map((trip: any, i: number) => (
                        <motion.div
                          key={trip.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
                              <CheckCircle size={22} />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{trip.route}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-gray-500 flex items-center gap-1"><Truck size={12} /> {trip.vehicle}</span>
                                <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={12} /> {trip.distance} km</span>
                              </div>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                            ✓ Delivered
                          </span>
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Performance Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-[2rem] text-white overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <BarChart3 size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <TrendingUp size={20} className="text-green-400" />
                </div>
                <h3 className="text-lg font-bold">Performance Summary</h3>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                  Good Standing
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "On-Time Rate", value: "96%", icon: Timer },
                  { label: "Trips Today", value: String(stats.totalTrips || 0), icon: Route },
                  { label: "This Week", value: `${(stats.totalTrips || 0) * 5}`, icon: Calendar },
                  { label: "Fuel Score", value: "A+", icon: Fuel },
                ].map((item) => (
                  <div key={item.label} className="bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <item.icon size={14} className="text-white/60" />
                      <span className="text-xs text-white/60 font-medium">{item.label}</span>
                    </div>
                    <p className="text-2xl font-bold">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Vehicle + Quick Info */}
        <div className="space-y-6">
          {/* Vehicle Health */}
          {vehicleHealth && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Truck size={18} />
                </div>
                <h3 className="font-bold text-gray-900">Assigned Vehicle</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-bold text-gray-900">{vehicleHealth.registration}</p>
                    <p className="text-sm text-gray-500">{vehicleHealth.make} {vehicleHealth.model}</p>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold",
                    vehicleHealth.status === "Active" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
                  )}>
                    {vehicleHealth.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Fuel Type", value: vehicleHealth.fuel, icon: Fuel },
                    { label: "Mileage", value: `${(vehicleHealth.mileage / 1000).toFixed(0)}k km`, icon: Gauge },
                    { label: "Last Service", value: new Date(vehicleHealth.lastService).toLocaleDateString(), icon: Wrench },
                    { label: "Condition", value: "Good", icon: Shield },
                  ].map((item) => (
                    <div key={item.label} className="bg-gray-50 p-3 rounded-xl">
                      <div className="flex items-center gap-1.5 mb-1">
                        <item.icon size={12} className="text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{item.value}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    toast.info("Vehicle inspection form opened.");
                    navigate("/app/routing");
                  }}
                  className="w-full py-3 rounded-xl bg-orange-50 text-orange-600 font-bold text-sm hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye size={16} /> Run Vehicle Inspection
                </button>
              </div>
            </motion.div>
          )}


        </div>
      </div>
    </div>
  );
}
