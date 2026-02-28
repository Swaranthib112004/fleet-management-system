import React from "react";
import {
   Plus, MapPin, Navigation, Search, Play, RotateCw, ChevronRight,
   Maximize2, X, Clock, Zap, Settings, Trash2, Fuel, Gauge, Route,
   Brain, Sparkles, TrendingUp, ArrowUpRight, Eye, Signal, Target,
   AlertTriangle, CheckCircle2, BarChart3, Compass, Layers, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { routesApi, trackedApi, vehiclesApi, driversApi } from "../lib/api";
import { LeafletMap } from "../components/LeafletMap";
import { io } from "socket.io-client";
import type { Route as RouteType, TrackedVehicle } from "../lib/types";

export function RoutingPage() {
   const [activeTab, setActiveTab] = React.useState("tracking");
   const [selectedVehicle, setSelectedVehicle] = React.useState<TrackedVehicle | null>(null);
   const [isOptimizing, setIsOptimizing] = React.useState(false);
   const [optimizedPath, setOptimizedPath] = React.useState<{ lat: number; lng: number }[]>([]);
   const [searchTerm, setSearchTerm] = React.useState("");
   const [routes, setRoutes] = React.useState<RouteType[]>([]);
   const [stops, setStops] = React.useState<string[]>(["", "", ""]);
   // Always use AI-powered optimization (backend falls back silently if needed)
   const [trackedVehicles, setTrackedVehicles] = React.useState<TrackedVehicle[]>([]);
   const [vehicleTracks, setVehicleTracks] = React.useState<
      Record<string, { lat: number; lng: number }[]>
   >({});
   const [mapCenter, setMapCenter] = React.useState<{ lat: number; lng: number }>(
      { lat: 28.6139, lng: 77.2090 }
   );
   const [loadingData, setLoadingData] = React.useState(false);
   const [isRouteModalOpen, setIsRouteModalOpen] = React.useState(false);
   const [vehicles, setVehicles] = React.useState<any[]>([]);
   const [drivers, setDrivers] = React.useState<any[]>([]);
   const [selectedTrip, setSelectedTrip] = React.useState<RouteType | null>(null);
   const [routeForm, setRouteForm] = React.useState({
      routeCode: "",
      vehicle: "",
      driver: "",
      startLocationName: "",
      startLocationLat: "",
      startLocationLng: "",
      endLocationName: "",
      endLocationLat: "",
      endLocationLng: "",
      waypoints: [{ address: "", lat: "", lng: "", stopType: "delivery", notes: "" }],
      status: "planned",
      startTime: new Date().toISOString().slice(0, 16),
      routeType: "standard"
   });
   const [optimizationMetrics, setOptimizationMetrics] = React.useState<any>(null);

   // Persistent headings per vehicle for smooth, natural movement (not random zigzag)
   const vehicleHeadingsRef = React.useRef<Record<string, number>>({});
   // Track whether initial center has been set
   const initialCenterSet = React.useRef(false);
   const [showTracks, setShowTracks] = React.useState(true);
   const [isFullscreen, setIsFullscreen] = React.useState(false);
   const [aiInsight, setAiInsight] = React.useState<string>("");

   const filteredVehicles = trackedVehicles.filter((v) =>
      (v.registration || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.driver || "").toLowerCase().includes(searchTerm.toLowerCase())
   );

   const movingCount = trackedVehicles.filter(v => v.status === "moving").length;
   const idleCount = trackedVehicles.filter(v => v.status === "idle").length;
   const offlineCount = trackedVehicles.filter(v => v.status === "offline").length;

   const handleOptimize = async () => {
      let filledStops = [];

      // If a trip is selected, use its waypoints
      if (selectedTrip) {
         if (selectedTrip.startLocation) {
            filledStops.push(`${selectedTrip.startLocation.latitude},${selectedTrip.startLocation.longitude}`);
         }
         if (selectedTrip.waypoints) {
            selectedTrip.waypoints.forEach((w: any) => {
               filledStops.push(`${w.latitude},${w.longitude}`);
            });
         }
         if (selectedTrip.endLocation) {
            filledStops.push(`${selectedTrip.endLocation.latitude},${selectedTrip.endLocation.longitude}`);
         }
      } else {
         // Otherwise use the manual stops from optimization tab
         filledStops = stops.filter((s) => s.trim().length > 0);
      }

      if (filledStops.length < 2) {
         toast.error("Please enter at least 2 stops or select a trip");
         return;
      }

      const waypoints = filledStops.map((s) => {
         const parts = s.split(',').map((x) => parseFloat(x.trim()));
         const lat = parts[0];
         const lng = parts[1];
         // Don't default to 0,0 which breaks the central ocean map view
         if (isFinite(lat) && isFinite(lng)) {
            return { latitude: lat, longitude: lng };
         }
         return null;
      }).filter(Boolean);

      if (waypoints.length < 2) {
         toast.error("Please enter valid coordinates in LAT,LNG format for at least 2 stops");
         return;
      }

      setIsOptimizing(true);
      setAiInsight("");
      try {
         const resp: any = await routesApi.optimize({
            waypoints,
            algorithm: "ai",
         });
         const data = resp.data || resp;

         const path = data.path || [];
         setOptimizedPath(path);
         setOptimizationMetrics(data.metrics || null);

         // Show which optimizer was actually used
         const optimizerUsed = data.optimizerUsed || data.algorithm || 'unknown';
         const isGpt = data.isGptOptimized === true;

         // Generate AI insight based on metrics - ONLY if GPT-4 succeeded
         if (data.metrics && isGpt) {
            const m = data.metrics;
            const insights = [];
            if (m.distanceSaved > 0) insights.push(`Save ${m.distanceSaved} km (${m.efficiencyGain}% shorter)`);
            if (m.timeSaved > 0) insights.push(`${m.timeSaved} min faster`);
            if (m.costSavings > 0) insights.push(`₹${m.costSavings} cost savings`);
            if (m.co2Reduction > 0) insights.push(`${m.co2Reduction} kg CO₂ reduced`);

            setAiInsight(insights.length > 0 ? insights.join(" • ") + " (GPT-4 Powered)" : "Route optimized with GPT-4! 🚀");
         }

         if (data.recommendations?.length > 0) {
            data.recommendations.forEach((r: string) => toast.info(r));
         }

         // Only show success toast if GPT-4 actually succeeded
         // Hide fallback algorithm messages completely
         if (isGpt) {
            toast.success("Route optimized with GPT-4! 🚀");
         } else {
            // Silent success for fallback - no toast message
            toast.info("Route optimization complete");
         }
      } catch (err: any) {
         toast.error(err.message || "Optimization failed");
      } finally {
         setIsOptimizing(false);
      }
   };

   const addStop = () => setStops((prev) => [...prev, ""]);
   const updateStop = (index: number, value: string) => setStops((prev) => prev.map((s, i) => (i === index ? value : s)));
   const removeStop = (index: number) => { if (stops.length <= 2) return; setStops((prev) => prev.filter((_, i) => i !== index)); };

   const handleAddRoute = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
         // Validate numeric coordinates for start and end locations to avoid
         // silently storing a wrong default (previously defaulted to Delhi coords).
         const sLat = parseFloat(routeForm.startLocationLat as any);
         const sLng = parseFloat(routeForm.startLocationLng as any);
         const eLat = parseFloat(routeForm.endLocationLat as any);
         const eLng = parseFloat(routeForm.endLocationLng as any);

         if (!isFinite(sLat) || !isFinite(sLng) || !isFinite(eLat) || !isFinite(eLng)) {
            toast.error("Please provide valid numeric coordinates for start and end locations (latitude and longitude).");
            return;
         }

         const payload = {
            routeCode: routeForm.routeCode || `RT-${Date.now()}`,
            vehicle: routeForm.vehicle,
            driver: routeForm.driver,
            startLocation: {
               name: routeForm.startLocationName,
               latitude: sLat,
               longitude: sLng
            },
            endLocation: {
               name: routeForm.endLocationName,
               latitude: eLat,
               longitude: eLng
            },
            waypoints: routeForm.waypoints
               .filter(w => w.address && w.lat && w.lng)
               .map(w => {
                  const wl = parseFloat(w.lat as any);
                  const wlng = parseFloat(w.lng as any);
                  return {
                     address: w.address,
                     latitude: isFinite(wl) ? wl : null,
                     longitude: isFinite(wlng) ? wlng : null,
                     stopType: w.stopType,
                     notes: w.notes,
                     estimatedTime: new Date(routeForm.startTime).toISOString()
                  };
               }),
            status: routeForm.status,
            startTime: new Date(routeForm.startTime).toISOString(),
            routeType: routeForm.routeType,
            totalStops: routeForm.waypoints.filter(w => w.address).length
         };

         await routesApi.create(payload);
         toast.success("Trip created successfully");
         await reloadRoutes();
         setIsRouteModalOpen(false);
         setRouteForm({
            routeCode: "",
            vehicle: "",
            driver: "",
            startLocationName: "",
            startLocationLat: "",
            startLocationLng: "",
            endLocationName: "",
            endLocationLat: "",
            endLocationLng: "",
            waypoints: [{ address: "", lat: "", lng: "", stopType: "delivery", notes: "" }],
            status: "planned",
            startTime: new Date().toISOString().slice(0, 16),
            routeType: "standard"
         });
      } catch (err: any) {
         toast.error(err.message || "Save failed");
      }
   };

   const handleDeleteRoute = async (id: string) => {
      if (!confirm("Delete this route?")) return;
      try {
         await routesApi.delete(id);
         toast.success("Route deleted");
         await reloadRoutes();
      } catch (err: any) {
         toast.error(err.message || "Delete failed");
      }
   };

   const reloadRoutes = async () => {
      setLoadingData(true);
      try {
         const resp: any = await routesApi.getAll();
         // routesApi.getAll may return either an array or a wrapped object
         if (Array.isArray(resp)) {
            setRoutes(resp);
         } else if (resp && resp.data) {
            setRoutes(resp.data || []);
         } else if (resp && resp.routes) {
            setRoutes(resp.routes || []);
         } else {
            setRoutes(resp || []);
         }
      } catch (err: any) {
         // Silently fall back to empty list
         console.warn("Failed to load routes:", err.message);
         setRoutes([]);
      } finally {
         setLoadingData(false);
      }
   };

   const reloadVehicles = async () => {
      try {
         // use api helper so auth headers and formatting are correct
         const resp: any = await vehiclesApi.getAll();
         const list = Array.isArray(resp) ? resp : resp.data || resp.vehicles || [];
         setVehicles(list || []);
      } catch (err) {
         console.warn("Failed to load vehicles", err);
         setVehicles([]);
      }
   };

   const reloadDrivers = async () => {
      try {
         const resp: any = await driversApi.getAll();
         // driversApi returns object with drivers array sometimes
         const list = Array.isArray(resp) ? resp : resp.drivers || [];
         setDrivers(list || []);
      } catch (err) {
         console.warn("Failed to load drivers", err);
         setDrivers([]);
      }
   };

   const addWaypoint = () => {
      setRouteForm(prev => ({
         ...prev,
         waypoints: [...prev.waypoints, { address: "", lat: "", lng: "", stopType: "delivery", notes: "" }]
      }));
   };

   const updateWaypoint = (index: number, field: string, value: string) => {
      setRouteForm(prev => ({
         ...prev,
         waypoints: prev.waypoints.map((w, i) => i === index ? { ...w, [field]: value } : w)
      }));
   };

   const removeWaypoint = (index: number) => {
      if (routeForm.waypoints.length <= 1) return;
      setRouteForm(prev => ({
         ...prev,
         waypoints: prev.waypoints.filter((_, i) => i !== index)
      }));
   };

   // Default simulation fleet — 3 vehicles for testing
   const DEFAULT_FLEET: TrackedVehicle[] = [
      { id: 'sim1', x: 77.2090, y: 28.6139, registration: 'DL-01-AB-1234', driver: 'Rajesh K.', status: 'moving', speed: 42 },
      { id: 'sim2', x: 77.2290, y: 28.6339, registration: 'DL-02-CD-5678', driver: 'Amit S.', status: 'moving', speed: 35 },
      { id: 'sim3', x: 77.1890, y: 28.5939, registration: 'DL-03-EF-9012', driver: 'Priya M.', status: 'idle', speed: 0 },
   ];

   /** Normalize any backend shape into a safe TrackedVehicle */
   const normalizeVehicle = (raw: any): TrackedVehicle | null => {
      if (!raw || typeof raw !== 'object') return null;
      const id = raw.id || raw._id || raw.vehicleId || '';
      // Accept x/y OR longitude/latitude
      const x = Number(raw.x ?? raw.longitude ?? raw.lng ?? NaN);
      const y = Number(raw.y ?? raw.latitude ?? raw.lat ?? NaN);
      if (!id || !isFinite(x) || !isFinite(y)) return null;
      const reg = raw.registration || raw.licensePlate || raw.vehicle?.licensePlate || id;
      const driver = raw.driver || raw.driverName || '';
      const status = (['moving', 'idle', 'offline'].includes(raw.status) ? raw.status
         : raw.isMoving ? 'moving' : raw.engineStatus === 'on' ? 'moving'
            : raw.engineStatus === 'idle' ? 'idle' : 'offline') as TrackedVehicle['status'];
      const speed = Number(raw.speed ?? 0);
      return { id, x, y, registration: reg, driver, status, speed };
   };

   const reloadTracked = async () => {
      try {
         const resp: any = await trackedApi.getAll();
         const arr = Array.isArray(resp) ? resp : [];
         const normalized = arr.map(normalizeVehicle).filter(Boolean) as TrackedVehicle[];
         setTrackedVehicles(normalized.length > 0 ? normalized : DEFAULT_FLEET);
      } catch {
         setTrackedVehicles(DEFAULT_FLEET);
      }
   };

   React.useEffect(() => {
      reloadRoutes();
      reloadTracked();
      reloadVehicles();
      reloadDrivers();
   }, []);

   // Build track history — skip any vehicle with invalid coords
   React.useEffect(() => {
      setVehicleTracks((prev) => {
         const next: typeof prev = { ...prev };
         trackedVehicles.forEach((v) => {
            if (v.x == null || v.y == null || !isFinite(v.x) || !isFinite(v.y)) return;
            const pos = { lat: v.y, lng: v.x };
            if (next[v.id]) {
               const last = next[v.id][next[v.id].length - 1];
               if (!last) { next[v.id] = [pos]; return; }
               const dx = pos.lng - last.lng;
               const dy = pos.lat - last.lat;
               if (dx * dx + dy * dy > 0.0000001) {
                  next[v.id] = [...next[v.id].slice(-50), pos];
               }
            } else {
               next[v.id] = [pos];
            }
         });
         return next;
      });
   }, [trackedVehicles]);

   // Real-time GPS movement simulation – smooth, natural paths
   React.useEffect(() => {
      const movementInterval = setInterval(() => {
         setTrackedVehicles((prev) =>
            prev.map((v) => {
               if (v.status !== 'moving') return v;
               const cx = Number(v.x); const cy = Number(v.y);
               if (!isFinite(cx) || !isFinite(cy)) return v;
               const prevHeading = vehicleHeadingsRef.current[v.id] ?? (Math.random() * Math.PI * 2);
               const drift = (Math.random() - 0.5) * 0.52;
               const heading = prevHeading + drift;
               vehicleHeadingsRef.current[v.id] = heading;
               const spd = 0.0004 + Math.random() * 0.0003;
               return {
                  ...v,
                  x: cx + Math.cos(heading) * spd,
                  y: cy + Math.sin(heading) * spd,
                  speed: Math.floor(25 + Math.random() * 35),
               };
            })
         );
      }, 3000);
      return () => clearInterval(movementInterval);
   }, []);

   // Socket for real-time locations
   React.useEffect(() => {
      const token = localStorage.getItem("fp_token");
      const socket = io((import.meta as any).env?.VITE_API_BASE || "http://localhost:8000", {
         auth: { token }
      });
      socket.on("location-updated", (payload: any) => {
         if (!payload) return;
         setTrackedVehicles((prev) =>
            prev.map((v) => (v.id === payload.id ? { ...v, ...payload } : v))
         );
      });
      return () => { socket.disconnect(); };
   }, []);

   // Map center logic — ONLY recenter on explicit user actions
   React.useEffect(() => {
      if (optimizedPath.length > 0 && optimizedPath[0]) {
         setMapCenter(optimizedPath[0]);
      }
   }, [optimizedPath]);

   React.useEffect(() => {
      if (selectedVehicle && isFinite(selectedVehicle.y) && isFinite(selectedVehicle.x)) {
         setMapCenter({ lat: selectedVehicle.y, lng: selectedVehicle.x });
      }
   }, [selectedVehicle?.id]);

   // When trip is selected, build the route path and optionally auto-select vehicle
   React.useEffect(() => {
      if (selectedTrip) {
         // Build route path from trip waypoints
         const routePath: { lat: number; lng: number }[] = [];

         // Add start location
         if (selectedTrip.startLocation) {
            routePath.push({
               lat: selectedTrip.startLocation.latitude,
               lng: selectedTrip.startLocation.longitude
            });
         }

         // Add waypoints
         if (selectedTrip.waypoints && Array.isArray(selectedTrip.waypoints)) {
            selectedTrip.waypoints.forEach(w => {
               routePath.push({
                  lat: w.latitude,
                  lng: w.longitude
               });
            });
         }

         // Add end location
         if (selectedTrip.endLocation) {
            routePath.push({
               lat: selectedTrip.endLocation.latitude,
               lng: selectedTrip.endLocation.longitude
            });
         }

         setOptimizedPath(routePath);

         // Optionally select the vehicle assigned to this trip
         if (selectedTrip.vehicle) {
            const vehicleId = typeof selectedTrip.vehicle === 'object' ? selectedTrip.vehicle._id || selectedTrip.vehicle.id : selectedTrip.vehicle;
            const vehicle = trackedVehicles.find(v => v.id === vehicleId);
            if (vehicle) {
               setSelectedVehicle(vehicle);
            }
         }
      }
   }, [selectedTrip, trackedVehicles]);

   React.useEffect(() => {
      if (!initialCenterSet.current && trackedVehicles.length > 0) {
         const v = trackedVehicles[0];
         if (v && isFinite(v.y) && isFinite(v.x)) {
            initialCenterSet.current = true;
            setMapCenter({ lat: v.y, lng: v.x });
         }
      }
   }, [trackedVehicles.length]);

   const handleVehicleMapClick = React.useCallback((id: string) => {
      const v = trackedVehicles.find(v => v.id === id);
      if (v) setSelectedVehicle(v);
   }, [trackedVehicles]);

   return (
      <div className={cn("space-y-6 max-w-[1800px] mx-auto pb-10", isFullscreen && "fixed inset-0 z-50 bg-gray-900 p-4 space-y-4")}>
         {/* Header */}
         <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-20"
         >
            <div>
               <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                     <Compass size={22} className="text-white" />
                  </div>
                  Routing & Tracking
               </h1>
               <p className="text-gray-500 font-medium mt-1">Real-time GPS visibility • AI-powered route optimization</p>
            </div>
            <div className="flex items-center gap-3">
               <div className="flex bg-gray-100 p-1 rounded-2xl">
                  {[
                     { key: "tracking", icon: Signal, label: "Live Tracking" },
                     { key: "routes", icon: Route, label: "Routes" },
                  ].map((tab) => (
                     <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                           "px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                           activeTab === tab.key ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                     >
                        <tab.icon size={16} />
                        <span className="hidden sm:inline">{tab.label}</span>
                     </button>
                  ))}
               </div>
               <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all"
               >
                  <Maximize2 size={18} className="text-gray-600" />
               </button>
            </div>
         </motion.div>

         {/* Main Grid */}
         <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-6", isFullscreen ? "h-[calc(100vh-100px)]" : "min-h-[600px] h-[calc(100vh-200px)]")}>
            {/* Left Sidebar */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-4 overflow-y-auto pr-1">

               {/* === TRACKING TAB === */}
               {activeTab === "tracking" && (
                  <div className="space-y-4">
                     {/* Fleet Stats Mini */}
                     <div className="grid grid-cols-3 gap-2">
                        {[
                           { label: "Active", count: movingCount, color: "bg-green-500", textColor: "text-green-600" },
                           { label: "Idle", count: idleCount, color: "bg-amber-500", textColor: "text-amber-600" },
                           { label: "Offline", count: offlineCount, color: "bg-gray-400", textColor: "text-gray-600" },
                        ].map((s) => (
                           <div key={s.label} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm text-center">
                              <div className={cn("w-2 h-2 rounded-full mx-auto mb-1.5", s.color)} />
                              <p className={cn("text-lg font-extrabold", s.textColor)}>{s.count}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                           </div>
                        ))}
                     </div>

                     {/* Search */}
                     <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                        <Search size={16} className="text-gray-400 shrink-0" />
                        <input
                           type="text"
                           placeholder="Search vehicle or driver..."
                           className="bg-transparent border-none focus:ring-0 text-sm outline-none w-full font-medium"
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && <button onClick={() => setSearchTerm("")}><X size={14} className="text-gray-400" /></button>}
                     </div>

                     {/* Track Toggle */}
                     <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Fleet Vehicles</span>
                        <button
                           onClick={() => { setShowTracks(!showTracks); toast.info(showTracks ? "Track lines hidden" : "Track lines visible"); }}
                           className={cn("px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                              showTracks ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-500"
                           )}
                        >
                           {showTracks ? "Tracks On" : "Tracks Off"}
                        </button>
                     </div>

                     {/* Vehicle List */}
                     <div className="space-y-2">
                        {filteredVehicles.map((v) => (
                           <motion.button
                              key={v.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              onClick={() => setSelectedVehicle(v)}
                              className={cn(
                                 "w-full text-left p-4 rounded-2xl border transition-all hover:border-blue-200",
                                 selectedVehicle?.id === v.id ? "bg-blue-50 border-blue-300 ring-2 ring-blue-100" : "bg-white border-gray-100 shadow-sm"
                              )}
                           >
                              <div className="flex justify-between items-start mb-2">
                                 <div className="flex items-center gap-2">
                                    <div className={cn(
                                       "w-2.5 h-2.5 rounded-full shrink-0",
                                       v.status === "moving" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" :
                                          v.status === "idle" ? "bg-amber-500" : "bg-gray-300"
                                    )} />
                                    <span className="font-bold text-gray-900 text-sm">{v.registration}</span>
                                 </div>
                                 <span className={cn(
                                    "text-xs font-bold px-2 py-0.5 rounded-full",
                                    v.status === "moving" ? "bg-green-50 text-green-600" :
                                       v.status === "idle" ? "bg-amber-50 text-amber-600" :
                                          "bg-gray-100 text-gray-500"
                                 )}>
                                    {v.status}
                                 </span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-500 font-medium gap-2">
                                 <span className="flex items-center gap-1 truncate max-w-[120px]">👤 {v.driver}</span>
                                 <span className="font-bold text-blue-600 flex items-center gap-1 shrink-0">
                                    <Gauge size={12} /> {v.speed} km/h
                                 </span>
                              </div>
                           </motion.button>
                        ))}
                        {filteredVehicles.length === 0 && (
                           <p className="text-center text-gray-400 text-sm font-medium py-6">No vehicles found</p>
                        )}
                     </div>

                     {/* Refresh */}
                     <button
                        onClick={() => { reloadTracked(); toast.success("Fleet data refreshed"); }}
                        className="w-full py-3 rounded-2xl border border-gray-200 bg-white text-gray-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
                     >
                        <RefreshCw size={16} /> Refresh Fleet
                     </button>
                  </div>
               )}

               {/* === ROUTES TAB === */}
               {activeTab === "routes" && (
                  <div className="space-y-4">
                     <button
                        onClick={() => {
                           setSelectedTrip(null);
                           setIsRouteModalOpen(true);
                        }}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                     >
                        <Plus size={18} /> Create New Trip
                     </button>

                     {selectedTrip && (
                        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-3">
                           <div className="flex justify-between items-start">
                              <div>
                                 <p className="font-bold text-blue-900 text-sm">Selected Trip</p>
                                 <p className="text-xs text-blue-700 mt-0.5">{selectedTrip.routeCode}</p>
                              </div>
                              <button
                                 onClick={() => setSelectedTrip(null)}
                                 className="text-blue-400 hover:text-blue-600"
                              >
                                 <X size={16} />
                              </button>
                           </div>
                           <button
                              onClick={() => {
                                 if (selectedTrip && selectedTrip.waypoints) {
                                    const waypoints = [];
                                    if (selectedTrip.startLocation) {
                                       waypoints.push([selectedTrip.startLocation.latitude, selectedTrip.startLocation.longitude]);
                                    }
                                    selectedTrip.waypoints.forEach((w: any) => {
                                       waypoints.push([w.latitude, w.longitude]);
                                    });
                                    if (selectedTrip.endLocation) {
                                       waypoints.push([selectedTrip.endLocation.latitude, selectedTrip.endLocation.longitude]);
                                    }
                                    handleOptimize();
                                 }
                              }}
                              disabled={isOptimizing}
                              className="w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                           >
                              {isOptimizing ? <RotateCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
                              {isOptimizing ? "Computing..." : "Optimize Route"}
                           </button>

                           {aiInsight && (
                              <motion.div
                                 initial={{ opacity: 0, y: 10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-3 rounded-xl mt-3"
                              >
                                 <div className="flex items-start gap-2">
                                    <Sparkles size={14} className="text-green-600 shrink-0 mt-0.5" />
                                    <div>
                                       <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-0.5">AI Recommendation</p>
                                       <p className="text-xs text-green-800 font-medium leading-relaxed">{aiInsight}</p>
                                    </div>
                                 </div>
                              </motion.div>
                           )}

                           {optimizationMetrics && (
                              <motion.div
                                 initial={{ opacity: 0, y: 10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3 mt-3"
                              >
                                 <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                    <BarChart3 size={14} className="text-indigo-600" /> Optimization Results
                                 </h4>
                                 <div className="grid grid-cols-2 gap-2">
                                    {[
                                       { label: "Distance Saved", value: `${optimizationMetrics.distanceSaved} km`, icon: MapPin, color: "text-blue-600 bg-blue-50" },
                                       { label: "Time Saved", value: `${optimizationMetrics.timeSaved} min`, icon: Clock, color: "text-amber-600 bg-amber-50" },
                                       { label: "Cost Savings", value: `₹${optimizationMetrics.costSavings}`, icon: TrendingUp, color: "text-green-600 bg-green-50" },
                                       { label: "Efficiency", value: `${optimizationMetrics.efficiencyGain}%`, icon: Zap, color: "text-violet-600 bg-violet-50" },
                                    ].map((m) => (
                                       <div key={m.label} className="bg-gray-50 p-2 rounded-lg">
                                          <div className="flex items-center gap-1 mb-1">
                                             <div className={cn("w-4 h-4 rounded flex items-center justify-center", m.color)}>
                                                <m.icon size={8} />
                                             </div>
                                             <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">{m.label}</span>
                                          </div>
                                          <p className="text-sm font-extrabold text-gray-900">{m.value}</p>
                                       </div>
                                    ))}
                                 </div>
                              </motion.div>
                           )}
                        </div>
                     )}

                     <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Active Trips ({routes.length})</h3>
                     <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {routes.map((r: any) => (
                           <motion.button
                              key={r._id || r.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              onClick={() => setSelectedTrip(r)}
                              className={cn(
                                 "w-full text-left p-3 rounded-2xl border transition-all",
                                 selectedTrip?._id === r._id || selectedTrip?.id === r.id
                                    ? "bg-blue-50 border-blue-300 ring-2 ring-blue-100"
                                    : "bg-white border-gray-100 hover:border-blue-200 shadow-sm"
                              )}
                           >
                              <div className="flex justify-between items-start mb-2">
                                 <div className="flex-1">
                                    <p className="font-bold text-gray-900 text-sm">{r.routeCode}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                       {r.startLocation?.name} → {r.endLocation?.name}
                                    </p>
                                 </div>
                                 <span className={cn(
                                    "text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ml-2",
                                    r.status === "active" ? "bg-green-50 text-green-600" :
                                       r.status === "planned" ? "bg-blue-50 text-blue-600" :
                                          r.status === "completed" ? "bg-gray-50 text-gray-600" :
                                             "bg-amber-50 text-amber-600"
                                 )}>
                                    {r.status}
                                 </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 font-medium">
                                 <span className="flex items-center gap-1">🚗 {typeof r.vehicle === 'object' ? r.vehicle?.registration : 'Vehicle'}</span>
                                 <span className="flex items-center gap-1">👤 {typeof r.driver === 'object' ? r.driver?.name : 'Driver'}</span>
                              </div>
                              <div className="mt-2 flex items-center justify-between text-[9px] text-gray-400">
                                 <span>{r.totalStops} stops</span>
                                 <button
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       handleDeleteRoute(r._id || r.id);
                                    }}
                                    className="text-red-500 hover:bg-red-50 px-2 py-1 rounded"
                                 >
                                    <Trash2 size={12} />
                                 </button>
                              </div>
                           </motion.button>
                        ))}
                        {routes.length === 0 && (
                           <div className="text-center py-8">
                              <Route size={36} className="text-gray-300 mx-auto mb-2" />
                              <p className="text-sm text-gray-400">No trips yet</p>
                           </div>
                        )}
                     </div>
                  </div>
               )}


            </div>

            {/* Main Map View */}
            <div className="lg:col-span-8 xl:col-span-9 rounded-[2rem] border border-gray-200 shadow-lg relative overflow-hidden flex flex-col bg-white z-10">
               {/* Map HUD Overlay */}
               <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
                  {/* Left: Map Controls */}
                  <div className="flex flex-col gap-2 pointer-events-auto">
                     <button
                        onClick={() => setShowTracks(!showTracks)}
                        className={cn(
                           "p-2.5 rounded-xl shadow-lg border transition-all",
                           showTracks ? "bg-indigo-600 text-white border-indigo-500" : "bg-white/90 text-gray-600 border-white backdrop-blur-sm"
                        )}
                        title="Toggle track lines"
                     >
                        <Layers size={18} />
                     </button>
                     <button
                        onClick={() => { setSelectedVehicle(null); setOptimizedPath([]); toast.info("Map reset"); }}
                        className="p-2.5 bg-white rounded-xl shadow-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                        title="Reset view"
                     >
                        <Target size={18} />
                     </button>
                  </div>

                  {/* Center: Fleet Status HUD */}
                  <div className="bg-white/90 backdrop-blur-xl px-6 py-3 rounded-2xl shadow-lg border border-gray-200 flex items-center gap-6 pointer-events-auto">
                     <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.5)]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-700">{movingCount} Active</span>
                     </div>
                     <div className="w-px h-4 bg-gray-300" />
                     <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-700">{idleCount} Idle</span>
                     </div>
                     <div className="w-px h-4 bg-gray-300" />
                     <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-600">{offlineCount} Offline</span>
                     </div>
                  </div>

                  {/* Right: Info */}
                  <div className="pointer-events-auto">
                     <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-gray-200 text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Signal size={14} className="text-blue-600" /> Live
                     </div>
                  </div>
               </div>

               {/* Map */}
               <div className="flex-1 relative">
                  <LeafletMap
                     centre={mapCenter}
                     zoom={13}
                     vehicles={trackedVehicles
                        .filter((v) => v.x != null && v.y != null && isFinite(v.x) && isFinite(v.y))
                        .map((v) => ({
                           id: v.id,
                           lat: v.y,
                           lng: v.x,
                           status: v.status,
                           registration: v.registration,
                           driver: v.driver,
                           speed: v.speed,
                        }))}
                     tracks={vehicleTracks}
                     showTracks={showTracks}
                     selectedVehicleId={selectedVehicle?.id || null}
                     onVehicleClick={handleVehicleMapClick}
                     darkMode={true}
                     optimizedRoute={optimizedPath}
                     routePolyline={optimizationMetrics?.routePolyline || []}
                  />

                  {/* Vehicle Detail Overlay */}
                  <AnimatePresence>
                     {selectedVehicle && (
                        <motion.div
                           initial={{ opacity: 0, y: 20, scale: 0.95 }}
                           animate={{ opacity: 1, y: 0, scale: 1 }}
                           exit={{ opacity: 0, y: 20, scale: 0.95 }}
                           className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[380px] bg-white p-6 rounded-[1.5rem] shadow-2xl border border-gray-100 z-20"
                        >
                           <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                 <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                                    selectedVehicle.status === "moving" ? "bg-green-100 text-green-600" :
                                       selectedVehicle.status === "idle" ? "bg-amber-100 text-amber-600" :
                                          "bg-gray-100 text-gray-600"
                                 )}>
                                    <Navigation size={24} />
                                 </div>
                                 <div>
                                    <h4 className="font-bold text-gray-900 text-lg">{selectedVehicle.registration}</h4>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                       <span className={cn(
                                          "w-2 h-2 rounded-full",
                                          selectedVehicle.status === "moving" ? "bg-green-500" :
                                             selectedVehicle.status === "idle" ? "bg-amber-500" : "bg-gray-400"
                                       )} />
                                       {selectedVehicle.status}
                                    </p>
                                 </div>
                              </div>
                              <button onClick={() => setSelectedVehicle(null)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400"><X size={16} /></button>
                           </div>

                           <div className="grid grid-cols-3 gap-3 mb-4">
                              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Speed</p>
                                 <p className="text-lg font-extrabold text-gray-900">{selectedVehicle.speed}</p>
                                 <p className="text-[10px] text-gray-400 font-bold">km/h</p>
                              </div>
                              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Driver</p>
                                 <p className="text-sm font-bold text-gray-900 truncate">{selectedVehicle.driver}</p>
                              </div>
                              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Location</p>
                                 <p className="text-[11px] font-bold text-gray-700">{(selectedVehicle.y ?? 0).toFixed(4)}</p>
                                 <p className="text-[11px] font-bold text-gray-700">{(selectedVehicle.x ?? 0).toFixed(4)}</p>
                              </div>
                           </div>

                           <div className="flex gap-2">
                              <button
                                 onClick={() => { toast.info("Live playback starting..."); }}
                                 className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-sm shadow-md"
                              >
                                 <Play size={14} /> Playback
                              </button>
                              <button
                                 onClick={() => {
                                    toast.info("Navigating to vehicle history...");
                                 }}
                                 className="flex-1 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all text-gray-700 font-bold text-sm flex items-center justify-center gap-2"
                              >
                                 <Clock size={14} /> History
                              </button>
                              <button
                                 onClick={() => {
                                    toast.success("Alert set for vehicle!");
                                 }}
                                 className="px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all text-gray-700"
                              >
                                 <AlertTriangle size={14} />
                              </button>
                           </div>
                        </motion.div>
                     )}
                  </AnimatePresence>
               </div>
            </div>
         </div>

         {/* Create/Edit Trip Modal */}
         <AnimatePresence>
            {isRouteModalOpen && (
               <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={() => setIsRouteModalOpen(false)}>
                  <motion.div
                     initial={{ scale: 0.95, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     exit={{ scale: 0.95, opacity: 0 }}
                     className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl p-8 my-8 max-h-[90vh] overflow-y-auto"
                     onClick={(e) => e.stopPropagation()}
                  >
                     <div className="flex justify-between items-start mb-8">
                        <div>
                           <h2 className="text-2xl font-bold">Create New Trip</h2>
                           <p className="text-sm text-gray-500 mt-1">Plan a route with vehicle, driver, and destinations</p>
                        </div>
                        <button onClick={() => setIsRouteModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
                     </div>
                     <form className="space-y-6" onSubmit={handleAddRoute}>
                        {/* Route Code */}
                        <div className="space-y-1.5">
                           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Trip Code (Auto-generated if empty)</label>
                           <input
                              type="text"
                              placeholder="e.g. RT-LDN-001"
                              value={routeForm.routeCode}
                              onChange={(e) => setRouteForm(p => ({ ...p, routeCode: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium"
                           />
                        </div>

                        {/* Vehicle & Driver Selection */}
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Vehicle *</label>
                              <select
                                 required
                                 value={routeForm.vehicle}
                                 onChange={(e) => setRouteForm(p => ({ ...p, vehicle: e.target.value }))}
                                 className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium"
                              >
                                 <option value="">Select Vehicle</option>
                                 {vehicles?.length === 0 && <option disabled>No vehicles available</option>}
                                 {(Array.isArray(vehicles) ? vehicles : []).map(v => (
                                    <option key={v._id || v.id} value={v._id || v.id}>{v.registration || v.name || v.licensePlate}</option>
                                 ))}
                              </select>
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Driver *</label>
                              <select
                                 required
                                 value={routeForm.driver}
                                 onChange={(e) => setRouteForm(p => ({ ...p, driver: e.target.value }))}
                                 className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium"
                              >
                                 <option value="">Select Driver</option>
                                 {drivers?.length === 0 && <option disabled>No drivers available</option>}
                                 {(Array.isArray(drivers) ? drivers : []).map(d => (
                                    <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>
                                 ))}
                              </select>
                           </div>
                        </div>

                        {/* Start Location */}
                        <div className="space-y-3 p-4 rounded-xl bg-green-50 border border-green-100">
                           <h4 className="text-sm font-bold text-green-900">Start Location (A)</h4>
                           <input
                              type="text"
                              placeholder="Location name"
                              required
                              value={routeForm.startLocationName}
                              onChange={(e) => setRouteForm(p => ({ ...p, startLocationName: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-green-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all font-medium text-sm"
                           />
                        </div>

                        {/* Waypoints */}
                        <div className="space-y-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                           <div className="flex justify-between items-center mb-3">
                              <h4 className="text-sm font-bold text-amber-900">Waypoints (Stops)</h4>
                              <button
                                 type="button"
                                 onClick={addWaypoint}
                                 className="text-amber-600 hover:text-amber-700 text-xs font-bold flex items-center gap-1"
                              >
                                 <Plus size={14} /> Add Stop
                              </button>
                           </div>
                           {routeForm.waypoints.map((wp, idx) => (
                              <div key={idx} className="space-y-2 p-3 bg-white rounded-lg border border-amber-200">
                                 <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded">Stop {idx + 1}</span>
                                    {routeForm.waypoints.length > 1 && (
                                       <button
                                          type="button"
                                          onClick={() => removeWaypoint(idx)}
                                          className="ml-auto text-red-500 hover:bg-red-50 p-1 rounded text-xs"
                                       >
                                          <Trash2 size={14} />
                                       </button>
                                    )}
                                 </div>
                                 <input
                                    type="text"
                                    placeholder="Stop address/name"
                                    value={wp.address}
                                    onChange={(e) => updateWaypoint(idx, "address", e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all font-medium text-sm"
                                 />
                                 <div className="grid grid-cols-2 gap-2">
                                    <input
                                       type="number"
                                       placeholder="Lat"
                                       step="0.0001"
                                       value={wp.lat}
                                       onChange={(e) => updateWaypoint(idx, "lat", e.target.value)}
                                       className="px-3 py-2 rounded-lg border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all font-medium text-sm"
                                    />
                                    <input
                                       type="number"
                                       placeholder="Lng"
                                       step="0.0001"
                                       value={wp.lng}
                                       onChange={(e) => updateWaypoint(idx, "lng", e.target.value)}
                                       className="px-3 py-2 rounded-lg border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all font-medium text-sm"
                                    />
                                 </div>
                                 <div className="grid grid-cols-2 gap-2">
                                    <select
                                       value={wp.stopType}
                                       onChange={(e) => updateWaypoint(idx, "stopType", e.target.value)}
                                       className="px-3 py-2 rounded-lg border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all font-medium text-sm"
                                    >
                                       <option value="delivery">Delivery</option>
                                       <option value="pickup">Pickup</option>
                                       <option value="inspection">Inspection</option>
                                    </select>
                                    <input
                                       type="text"
                                       placeholder="Notes"
                                       value={wp.notes}
                                       onChange={(e) => updateWaypoint(idx, "notes", e.target.value)}
                                       className="px-3 py-2 rounded-lg border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all font-medium text-sm"
                                    />
                                 </div>
                              </div>
                           ))}
                        </div>

                        {/* End Location */}
                        <div className="space-y-3 p-4 rounded-xl bg-red-50 border border-red-100">
                           <h4 className="text-sm font-bold text-red-900">End Location (B) *</h4>
                           <input
                              type="text"
                              placeholder="Location name"
                              required
                              value={routeForm.endLocationName}
                              onChange={(e) => setRouteForm(p => ({ ...p, endLocationName: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border border-red-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all font-medium text-sm"
                           />
                        </div>

                        {/* Status, Start Time, Route Type */}
                        <div className="grid grid-cols-3 gap-4">
                           <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Start Time</label>
                              <input
                                 type="datetime-local"
                                 required
                                 value={routeForm.startTime}
                                 onChange={(e) => setRouteForm(p => ({ ...p, startTime: e.target.value }))}
                                 className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium"
                              />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Route Type</label>
                              <select
                                 value={routeForm.routeType}
                                 onChange={(e) => setRouteForm(p => ({ ...p, routeType: e.target.value }))}
                                 className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium"
                              >
                                 <option value="standard">Standard</option>
                                 <option value="express">Express</option>
                                 <option value="optimized">Optimized</option>
                              </select>
                           </div>
                        </div>

                        <div className="pt-4 flex gap-4">
                           <button type="button" onClick={() => setIsRouteModalOpen(false)} className="flex-1 py-4 rounded-2xl border border-gray-200 font-bold hover:bg-gray-50 transition-all">Cancel</button>
                           <button type="submit" className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">Create Trip</button>
                        </div>
                     </form>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>
      </div>
   );
}
