import React, { useState } from "react";
import {
   Plus, MapPin, Navigation, Search, Play, RotateCw, ChevronRight,
   Maximize2, X, Clock, Zap, Settings, Trash2, Fuel, Gauge, Route,
   Brain, Sparkles, TrendingUp, ArrowUpRight, Eye, Signal, Target,
   AlertTriangle, CheckCircle2, BarChart3, Compass, Layers, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { routesApi, trackedApi, vehiclesApi, driversApi, auditApi } from "../lib/api";
import { LeafletMap } from "../components/LeafletMap";
import { io } from "socket.io-client";
import type { Route as RouteType, TrackedVehicle } from "../lib/types";

// ─── Advanced Location Search (Multi-source: Photon + Nominatim) ─────────────
// Searches two free APIs simultaneously for maximum coverage worldwide.
// Starts after 2 characters, deduplicates results, shows type badges.
function LocationSearch({
   value,
   onSelect,
   placeholder,
   className,
}: {
   value: string;
   onSelect: (name: string, lat: number, lng: number) => void;
   placeholder?: string;
   className?: string;
}) {
   const [query, setQuery] = React.useState(value);
   const [suggestions, setSuggestions] = React.useState<any[]>([]);
   const [loading, setLoading] = React.useState(false);
   const [selected, setSelected] = React.useState(false);
   const [noResults, setNoResults] = React.useState(false);
   const debounceRef = React.useRef<any>(null);
   const abortRef = React.useRef<AbortController | null>(null);

   React.useEffect(() => { setQuery(value); }, [value]);

   const normalizePhoton = (item: any): any => {
      const p = item.properties || {};
      const coords = item.geometry?.coordinates;
      if (!coords) return null;
      const lng = coords[0];
      const lat = coords[1];
      const nameParts = [p.name, p.street, p.city, p.state, p.country].filter(Boolean);
      const display_name = nameParts.join(", ");
      const short = p.name || p.street || p.city || display_name.split(",")[0];
      const type = p.osm_value || p.type || "place";
      return { lat: String(lat), lon: String(lng), display_name, short, type, source: "photon" };
   };

   const normalizeNominatim = (item: any): any => {
      const short = item.display_name?.split(",")[0] || item.name || "";
      const type = item.type || item.class || "place";
      return { ...item, short, type, source: "nominatim" };
   };

   const fetchSuggestions = async (q: string) => {
      if (q.trim().length < 2) { setSuggestions([]); setNoResults(false); return; }
      setLoading(true);
      setNoResults(false);

      // Cancel any previous in-flight requests
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      const { signal } = abortRef.current;

      try {
         // Fire both APIs in parallel for maximum coverage
         const [photonRes, nominatimRes] = await Promise.allSettled([
            // Photon (Komoot) — excellent global coverage, especially for Indian cities
            fetch(
               `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en`,
               { signal }
            ).then(r => r.json()).then(d => (d.features || []).map(normalizePhoton).filter(Boolean)),

            // Nominatim OSM — global, authoritative, great for addresses
            fetch(
               `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1&extratags=1&accept-language=en`,
               { signal, headers: { "Accept-Language": "en" } }
            ).then(r => r.json()).then(d => (d || []).map(normalizeNominatim)),
         ]);

         const photon = photonRes.status === "fulfilled" ? photonRes.value : [];
         const nominatim = nominatimRes.status === "fulfilled" ? nominatimRes.value : [];

         // Merge and deduplicate by proximity (~1km similarity check)
         const seen = new Set<string>();
         const merged: any[] = [];

         const addIfUnique = (item: any) => {
            if (!item?.lat || !item?.lon) return;
            const lat = parseFloat(item.lat);
            const lon = parseFloat(item.lon);
            if (!isFinite(lat) || !isFinite(lon)) return;
            // Round to 2 decimal places for deduplication key (~1km radius)
            const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
            if (!seen.has(key)) {
               seen.add(key);
               merged.push(item);
            }
         };

         // Interleave results for best variety
         const maxLen = Math.max(photon.length, nominatim.length);
         for (let i = 0; i < maxLen; i++) {
            if (photon[i]) addIfUnique(photon[i]);
            if (nominatim[i]) addIfUnique(nominatim[i]);
         }

         setSuggestions(merged.slice(0, 10));
         setNoResults(merged.length === 0);
      } catch (e: any) {
         if (e.name !== "AbortError") {
            setSuggestions([]);
            setNoResults(true);
         }
      } finally {
         setLoading(false);
      }
   };

   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setQuery(v);
      setSelected(false);
      clearTimeout(debounceRef.current);
      if (v.length === 0) { setSuggestions([]); setNoResults(false); return; }
      // Fast debounce: 300ms for >= 3 chars, 600ms for 2 chars (slower for very short)
      debounceRef.current = setTimeout(() => fetchSuggestions(v), v.length < 3 ? 600 : 300);
   };

   // Type badge colour mapping
   const typeBadge = (type: string) => {
      const t = (type || "").toLowerCase();
      if (["city", "town", "village", "municipality"].includes(t)) return "bg-blue-50 text-blue-600";
      if (["airport", "aerodrome"].includes(t)) return "bg-violet-50 text-violet-600";
      if (["station", "railway", "bus_stop"].includes(t)) return "bg-amber-50 text-amber-600";
      if (["hospital", "clinic"].includes(t)) return "bg-red-50 text-red-600";
      if (["university", "school"].includes(t)) return "bg-green-50 text-green-600";
      if (["hotel", "hostel"].includes(t)) return "bg-pink-50 text-pink-600";
      return "bg-gray-50 text-gray-600";
   };

   const handleSelect = (item: any) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      const fullName = item.display_name;
      const shortName = item.short || fullName.split(",")[0];
      setQuery(shortName);
      setSuggestions([]);
      setNoResults(false);
      setSelected(true);
      onSelect(fullName, lat, lng);
   };

   return (
      <div className="relative">
         <div className="relative flex items-center">
            <MapPin size={15} className="absolute left-3 text-gray-400 pointer-events-none" />
            <input
               type="text"
               placeholder={placeholder || "Type to search location worldwide..."}
               value={query}
               onChange={handleChange}
               onFocus={() => { if (query.length >= 2 && suggestions.length === 0 && !selected) fetchSuggestions(query); }}
               onBlur={() => setTimeout(() => setSuggestions([]), 250)}
               className={`${className} pl-8`}
               autoComplete="off"
               spellCheck={false}
            />
            {loading && (
               <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
               </div>
            )}
            {selected && !loading && (
               <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                  <CheckCircle2 size={16} />
               </div>
            )}
         </div>

         {/* Suggestions dropdown */}
         {(suggestions.length > 0 || noResults) && (
            <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
               {noResults ? (
                  <div className="px-4 py-5 text-center text-sm text-gray-400 font-medium">
                     <MapPin size={20} className="mx-auto mb-2 text-gray-300" />
                     No locations found. Try a shorter or different search term.
                  </div>
               ) : (
                  suggestions.map((s, i) => (
                     <button
                        key={i}
                        type="button"
                        onMouseDown={() => handleSelect(s)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors group"
                     >
                        <div className="flex items-start gap-3">
                           <div className="mt-0.5 text-gray-400 shrink-0 group-hover:text-blue-500 transition-colors">
                              <MapPin size={14} />
                           </div>
                           <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                 <p className="text-sm font-bold text-gray-900 truncate">{s.short || s.display_name.split(",")[0]}</p>
                                 <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 uppercase tracking-wider ${typeBadge(s.type)}`}>{s.type}</span>
                              </div>
                              <p className="text-[11px] text-gray-500 truncate">{s.display_name}</p>
                              <p className="text-[10px] text-blue-500 font-bold mt-0.5">
                                 📍 {parseFloat(s.lat).toFixed(5)}, {parseFloat(s.lon).toFixed(5)}
                              </p>
                           </div>
                        </div>
                     </button>
                  ))
               )}
               <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-1">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Powered by OpenStreetMap</span>
               </div>
            </div>
         )}
      </div>
   );
}

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
   const [optimizeError, setOptimizeError] = useState<string | null>(null);

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

   const isCompleted = selectedTrip?.status === "completed";

   const handleOptimize = async () => {
      setOptimizeError(null);
      try {
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

            const metrics = data.metrics || null;
            // Use high-resolution road path for the line, but keep stops for markers
            const roadPath = data.polylineValid && Array.isArray(data.routePolyline) && data.routePolyline.length > 1
               ? data.routePolyline
               : data.path || [];

            setOptimizedPath(data.path || []); // Path for markers (stops sequence)
            setOptimizationMetrics({ ...metrics, routePolyline: roadPath }); // High-res path for the line

            if (roadPath.length > 1) {
               const firstPoint = roadPath[0];
               // Find vehicle by selectedTrip, OR fall back to first active moving vehicle
               setTrackedVehicles(prev => {
                  const tripId = selectedTrip
                     ? ((selectedTrip as any)._id || (selectedTrip as any).id)
                     : null;
                  // Try to match on tripId; if no match, update the first moving vehicle
                  const hasMatch = tripId ? prev.some(v => v.routeId === tripId || v.id === tripId) : false;
                  return prev.map((v, idx) => {
                     const isTarget = tripId
                        ? (v.routeId === tripId || v.id === tripId)
                        : (!hasMatch && idx === 0); // fallback: first vehicle
                     if (!isTarget) return v;
                     return {
                        ...v,
                        // Snap vehicle position to the start of the road line
                        x: firstPoint.lng,
                        y: firstPoint.lat,
                        routeWaypoints: roadPath,
                        waypointIndex: 0,
                        status: 'moving' as const,
                        speed: 65, // Ensure positive speed for simulation
                        routeId: tripId || undefined // Explicitly tie to trip
                     };
                  });
               });
            } else {
               // Show error or notification if polyline is invalid
               console.error('No valid polyline received from backend.');
            }

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

            // 🚀 PERSIST IMMEDIATELY if we have a selected trip
            if (selectedTrip && roadPath.length > 0) {
               try {
                  const updateData: any = {
                     routePolyline: roadPath,
                     isOptimized: true,
                     optimizationScore: metrics?.efficiencyGain || 0,
                     totalDistance: metrics?.distance || 0,
                     totalDuration: metrics?.duration || 0,
                     distanceSaved: metrics?.distanceSaved || 0,
                     timeSaved: metrics?.timeSaved || 0,
                     costSavings: metrics?.costSavings || 0,
                     co2Reduction: metrics?.co2Reduction || 0,
                     efficiencyGain: metrics?.efficiencyGain || 0
                  };
                  await routesApi.update(selectedTrip._id || selectedTrip.id!, updateData);
                  try { await auditApi.add({ action: "route_optimized", target: `${selectedTrip.routeCode || selectedTrip.vehicle || "Route"}`, user: "current", createdAt: new Date().toISOString() } as any); } catch { }
                  console.log("Optimized route persisted to DB", updateData);
                  await reloadRoutes(); // Refresh local state with saved data
               } catch (saveErr) {
                  console.error("Failed to persist optimized route:", saveErr);
               }
            }

            setIsOptimizing(false);
         } catch (err: any) {
            console.error("Optimization failed:", err);
            const errorMessage = err.response?.data?.error || err.message || "Error optimizing route";
            toast.error(errorMessage);
            setIsOptimizing(false);
         }
      } catch (err: any) {
         console.error("Optimization failed:", err);
         const errorMessage = err.response?.data?.error || err.message || "Error optimizing route";
         toast.error(errorMessage);
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
                     latitude: isFinite(wl) ? wl : 0,
                     longitude: isFinite(wlng) ? wlng : 0,
                     stopType: w.stopType as "delivery" | "pickup" | "inspection",
                     notes: w.notes,
                     estimatedTime: new Date(routeForm.startTime).toISOString()
                  };
               }),
            status: routeForm.status as "planned" | "active" | "paused" | "completed",
            startTime: new Date(routeForm.startTime).toISOString(),
            routeType: routeForm.routeType as "standard" | "express" | "optimized",
            totalStops: routeForm.waypoints.filter(w => w.address).length,
            totalDistance: 0,
            totalDuration: 0,
         };

         await routesApi.create(payload);
         try { await auditApi.add({ action: "route_created", target: `${payload.routeCode || "Trip"} - ${payload.vehicle || "N/A"}`, user: "current", createdAt: new Date().toISOString() } as any); } catch { }
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
      const existing = routes.find(r => (r.id || r._id) === id);
      try {
         await routesApi.delete(id);
         try { await auditApi.add({ action: "route_deleted", target: existing ? `${existing.routeCode || existing.vehicle || "Route"}` : id, user: "current", createdAt: new Date().toISOString() } as any); } catch { }
         toast.success("Route deleted");
         await reloadRoutes();
      } catch (err: any) {
         toast.error(err.message || "Delete failed");
      }
   };

   const handleUpdateTripStatus = async (id: string, newStatus: string) => {
      try {
         // If starting an optimized trip, include the polyline we generated
         const updateData: Partial<RouteType> = { status: newStatus as any };
         if (newStatus === 'active') {
            // Priority: optimizedPath > selectedTrip.routePolyline
            const activePath = (optimizedPath && optimizedPath.length > 0)
               ? optimizedPath
               : (selectedTrip?.routePolyline || []);

            if (activePath.length > 0) {
               updateData.routePolyline = activePath;
               updateData.isOptimized = true;
               if (optimizationMetrics) {
                  updateData.totalDistance = optimizationMetrics.distance;
                  updateData.totalDuration = optimizationMetrics.duration;
                  updateData.optimizationScore = optimizationMetrics.efficiencyGain;
               }
            }
         }

         await routesApi.update(id, updateData);
         const route = routes.find(r => (r.id || r._id) === id);
         try { await auditApi.add({ action: "route_updated", target: `${route?.routeCode || route?.vehicle || "Route"} → ${newStatus}`, user: "current", createdAt: new Date().toISOString() } as any); } catch { }
         toast.success(`Trip marked as ${newStatus}`);
         await reloadRoutes();
      } catch (err: any) {
         toast.error(err.message || "Update failed");
      }
   };

   const reloadRoutes = async () => {
      setLoadingData(true);
      try {
         const resp: any = await routesApi.getAll();
         // routesApi.getAll may return either an array or a wrapped object
         let fetchedRoutes: RouteType[] = [];
         if (Array.isArray(resp)) {
            fetchedRoutes = resp;
         } else if (resp && resp.data) {
            fetchedRoutes = resp.data || [];
         } else if (resp && resp.routes) {
            fetchedRoutes = resp.routes || [];
         } else {
            fetchedRoutes = resp || [];
         }
         setRoutes(fetchedRoutes);
         // Immediately rebuild tracked vehicles from fresh route data
         // (can't rely on `routes` state here — it's still the old value)
         reloadTracked(fetchedRoutes);
      } catch (err: any) {
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

   /**
    * Build tracked vehicles from real routes stored in DB.
    * Each active/planned route becomes a tracked vehicle placed at its start location.
    * This ensures Live Tracking always shows created trip vehicles, not fake ones.
    */
   const buildTrackedFromRoutes = (routeList: RouteType[]): TrackedVehicle[] => {
      const activeRoutes = routeList.filter((r: any) =>
         ['planned', 'active', 'in-progress', 'in_progress'].includes((r.status || '').toLowerCase())
      );

      if (activeRoutes.length === 0) return [];

      return activeRoutes.map((r: any, idx: number) => {
         // Prefer start location coords; fall back to waypoint if missing
         const startLat = r.startLocation?.latitude ?? r.waypoints?.[0]?.latitude ?? 28.6139;
         const startLng = r.startLocation?.longitude ?? r.waypoints?.[0]?.longitude ?? 77.2090;

         // Vehicle registration: object with .registration, or plain string, or ID
         const reg = typeof r.vehicle === 'object'
            ? (r.vehicle?.registration || r.vehicle?.licensePlate || `RT-${idx + 1}`)
            : (r.vehicle || `Trip-${idx + 1}`);

         // Driver name: object with .name, or plain string
         const driverName = typeof r.driver === 'object'
            ? (r.driver?.name || 'Driver')
            : (r.driver || 'Driver');

         const isActive = ['active', 'in-progress', 'in_progress'].includes((r.status || '').toLowerCase());

         // Build a full waypoint path: 
         // 1. Prefer saved high-res road geometry (routePolyline)
         // 2. Fall back to raw stops
         let waypointPath: { lat: number; lng: number }[] = [];

         if (r.routePolyline && r.routePolyline.length > 0) {
            waypointPath = r.routePolyline;
         } else {
            // Start location as first point
            waypointPath.push({ lat: startLat, lng: startLng });

            if (r.waypoints && r.waypoints.length > 0) {
               r.waypoints.forEach((w: any) => {
                  if (isFinite(w.latitude) && isFinite(w.longitude)) {
                     waypointPath.push({ lat: w.latitude, lng: w.longitude });
                  }
               });
            }
            // Always add end location as final waypoint if not already in polyline
            if (r.endLocation && isFinite(r.endLocation.latitude) && isFinite(r.endLocation.longitude)) {
               waypointPath.push({ lat: r.endLocation.latitude, lng: r.endLocation.longitude });
            }
         }

         // Resumption logic: Use last known position if trip is active
         const lastPos = r.lastPosition;
         const effectiveLat = lastPos?.lat ?? r.startLocation?.latitude ?? r.waypoints?.[0]?.latitude ?? 28.6139;
         const effectiveLng = lastPos?.lng ?? r.startLocation?.longitude ?? r.waypoints?.[0]?.longitude ?? 77.2090;
         const startIndex = lastPos?.waypointIndex ?? 0;

         // Snap current position to path or use start coords
         const currentX = (waypointPath[startIndex]) ? waypointPath[startIndex].lng : effectiveLng;
         const currentY = (waypointPath[startIndex]) ? waypointPath[startIndex].lat : effectiveLat;

         return {
            id: r._id || r.id || `route-${idx}`,
            routeId: r._id || r.id,
            x: currentX,
            y: currentY,
            targetLat: r.endLocation?.latitude,
            targetLng: r.endLocation?.longitude,
            routeWaypoints: waypointPath.length > 0 ? waypointPath : undefined,
            waypointIndex: startIndex,
            registration: reg,
            driver: driverName,
            status: isActive ? 'moving' : 'idle',
            speed: isActive ? Math.floor(25 + Math.random() * 30) : 0,
         } as TrackedVehicle;
      });
   };

   const reloadTracked = async (routeList?: RouteType[]) => {
      const list = routeList ?? routes;
      const fromRoutes = buildTrackedFromRoutes(list);

      setTrackedVehicles(prev => {
         if (prev.length === 0) return fromRoutes;

         // Merge logic: preserve existing movement state for vehicles we are already simulating
         return fromRoutes.map(newV => {
            const existing = prev.find(ext => ext.id === newV.id);

            // If this vehicle is currently in a high-res AI simulation, PROTECT it
            const isSimulating = existing && (
               existing.status === 'moving' ||
               (existing.routeWaypoints && existing.routeWaypoints.length > 10)
            );

            if (isSimulating) {
               return {
                  ...newV,
                  x: existing.x,
                  y: existing.y,
                  status: existing.status,
                  speed: Number(existing.speed) > 0 ? existing.speed : 65, // ensure it has speed
                  routeWaypoints: existing.routeWaypoints,
                  waypointIndex: existing.waypointIndex
               };
            }
            return newV;
         });
      });
   };

   React.useEffect(() => {
      reloadRoutes();
      reloadVehicles();
      reloadDrivers();
   }, []);

   // Whenever routes change (new trip added/deleted), rebuild the tracked fleet list
   React.useEffect(() => {
      if (routes.length > 0) {
         reloadTracked(routes);
      }
   }, [routes]);

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

   // Real-time GPS movement simulation – vehicle snaps precisely along AI-optimized route path
   React.useEffect(() => {
      const movementInterval = setInterval(() => {
         setTrackedVehicles((prev) =>
            prev.map((v) => {
               if (v.status !== 'moving') return v;
               const cx = Number(v.x); const cy = Number(v.y);
               if (!isFinite(cx) || !isFinite(cy)) return v;

               if (v.routeWaypoints && v.routeWaypoints.length > 0) {
                  // ── AI ROUTE MODE: follow OSRM road geometry precisely ──
                  const totalPts = v.routeWaypoints.length;
                  let wpIdx = v.waypointIndex ?? 0;
                  if (wpIdx >= totalPts) wpIdx = totalPts - 1;

                  // Simulation speed: ULTRA-BOOSTED for visible movement (200x accelerator)
                  const SPEED_MULTIPLIER = 200;
                  const currentSpeed = Number(v.speed) || 65;
                  const tickStep = (currentSpeed * SPEED_MULTIPLIER / 111.3) / 3600;

                  let remaining = tickStep;
                  let newX = cx || 77.2; // Fallback to avoid NaN
                  let newY = cy || 28.6;
                  let newIdx = wpIdx;

                  while (remaining > 0 && newIdx < totalPts) {
                     const wp = v.routeWaypoints[newIdx];
                     const dx = wp.lng - newX;
                     const dy = wp.lat - newY;
                     const dist = Math.sqrt(dx * dx + dy * dy);

                     if (dist <= remaining) {
                        newX = wp.lng;
                        newY = wp.lat;
                        remaining -= dist;
                        newIdx = Math.min(newIdx + 1, totalPts - 1);
                        if (newIdx === totalPts - 1) break;
                     } else {
                        const ratio = remaining / dist;
                        newX = newX + dx * ratio;
                        newY = newY + dy * ratio;
                        remaining = 0;
                     }
                  }

                  vehicleHeadingsRef.current[v.id] = Math.atan2(newY - cy, newX - cx);

                  return {
                     ...v,
                     x: newX,
                     y: newY,
                     waypointIndex: newIdx,
                     speed: Math.floor(currentSpeed), // Keep reported speed but move faster
                  };
               } else if (v.targetLat && v.targetLng) {
                  // Fallback: slow drift toward target
                  const heading = Math.atan2(v.targetLat - cy, v.targetLng - cx) + (Math.random() - 0.5) * 0.3;
                  const spd = 0.002; // Faster fallback
                  vehicleHeadingsRef.current[v.id] = heading;
                  return {
                     ...v,
                     x: cx + Math.cos(heading) * spd,
                     y: cy + Math.sin(heading) * spd,
                     speed: 25,
                  };
               } else {
                  return v;
               }
            })
         );
      }, 1000); // 1-second ticks for smoother movement
      return () => clearInterval(movementInterval);
   }, []);

   // Destination Geofencing Check (~500m radius)
   const completingRoutesRef = React.useRef<Set<string>>(new Set());
   React.useEffect(() => {
      trackedVehicles.forEach(v => {
         if (v.status === 'moving' && v.targetLat && v.targetLng && v.routeId) {
            const dy = v.targetLat - v.y;
            const dx = v.targetLng - v.x;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // 0.005 degrees is approx ~500 meters
            if (dist < 0.005 && !completingRoutesRef.current.has(v.routeId)) {
               completingRoutesRef.current.add(v.routeId);
               toast.success(`📍 ${v.registration} has arrived at destination! Auto-completing trip...`, { duration: 6000 });
               handleUpdateTripStatus(v.routeId, "completed");
            }
         }
      });
   }, [trackedVehicles]);

   // Socket for real-time locations
   React.useEffect(() => {
      const token = localStorage.getItem("fp_token");
      const socket = io((import.meta as any).env?.VITE_API_BASE || "https://fleet-management-backend-p8kw.onrender.com", {
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

         // Use high-res polyline if available, otherwise use raw stops
         if (selectedTrip.routePolyline && selectedTrip.routePolyline.length > 0) {
            setOptimizedPath(selectedTrip.routePolyline);
         } else {
            setOptimizedPath(routePath);
         }

         // Optionally select the vehicle assigned to this trip
         if (selectedTrip.vehicle) {
            const vehicleId = typeof selectedTrip.vehicle === 'object' ? selectedTrip.vehicle._id || selectedTrip.vehicle.id : selectedTrip.vehicle;
            const vehicle = trackedVehicles.find(v => v.id === vehicleId);
            if (vehicle) {
               setSelectedVehicle(vehicle);
            }
         }

         // Restore optimization results if this trip was previously optimized
         if (selectedTrip.isOptimized) {
            setOptimizationMetrics({
               distance: selectedTrip.totalDistance || 0,
               duration: selectedTrip.totalDuration || 0,
               efficiencyGain: selectedTrip.efficiencyGain || selectedTrip.optimizationScore || 0,
               distanceSaved: selectedTrip.distanceSaved || 0,
               timeSaved: selectedTrip.timeSaved || 0,
               costSavings: selectedTrip.costSavings || 0,
               co2Reduction: selectedTrip.co2Reduction || 0,
               routePolyline: selectedTrip.routePolyline
            } as any);
            const savings = selectedTrip.costSavings || (selectedTrip.totalDistance || 0) * 0.5;
            setAiInsight(`Previously optimized for ${selectedTrip.routeCode}. Enjoy ₹${Math.round(savings)} estimated savings! 🚀`);
         } else {
            // Clear if trip is not optimized
            setOptimizationMetrics(null);
            setAiInsight("");
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
                              onClick={handleOptimize}
                              className="w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                           >
                              {isOptimizing ? <RotateCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
                              {isOptimizing ? "Computing..." : "Optimize Route"}
                           </button>

                           {optimizeError && (
                              <div className="text-red-500 mt-2">{optimizeError}</div>
                           )}
                           {optimizationMetrics && !isOptimizing && (
                              <motion.button
                                 initial={{ opacity: 0, scale: 0.95 }}
                                 animate={{ opacity: 1, scale: 1 }}
                                 onClick={() => {
                                    if (selectedTrip) {
                                       handleUpdateTripStatus(selectedTrip._id || selectedTrip.id!, "active");
                                    }
                                 }}
                                 className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-extrabold hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg flex items-center justify-center gap-2"
                              >
                                 <Play size={16} fill="white" /> Start Trip
                              </motion.button>
                           )}

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
                                 <div className="flex gap-2">
                                    {r.status === "planned" && (
                                       <button
                                          onClick={(e) => {
                                             e.stopPropagation();
                                             handleUpdateTripStatus(r._id || r.id, "active");
                                          }}
                                          className="text-green-600 bg-green-50 hover:bg-green-100 font-bold px-2 py-1 rounded"
                                       >
                                          Start 🚀
                                       </button>
                                    )}

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
                           <LocationSearch
                              value={routeForm.startLocationName}
                              placeholder="Search start location (e.g. Delhi, Mumbai)..."
                              className="w-full px-4 py-2 rounded-lg border border-green-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all font-medium text-sm pr-9"
                              onSelect={(name, lat, lng) => {
                                 setRouteForm(p => ({
                                    ...p,
                                    startLocationName: name,
                                    startLocationLat: String(lat),
                                    startLocationLng: String(lng),
                                 }));
                              }}
                           />
                           {routeForm.startLocationLat && (
                              <p className="text-[11px] text-green-700 font-bold">
                                 ✅ Coords: {parseFloat(routeForm.startLocationLat).toFixed(4)}, {parseFloat(routeForm.startLocationLng).toFixed(4)}
                              </p>
                           )}
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
                           <LocationSearch
                              value={routeForm.endLocationName}
                              placeholder="Search end location (e.g. Bangalore, Chennai)..."
                              className="w-full px-4 py-2 rounded-lg border border-red-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all font-medium text-sm pr-9"
                              onSelect={(name, lat, lng) => {
                                 setRouteForm(p => ({
                                    ...p,
                                    endLocationName: name,
                                    endLocationLat: String(lat),
                                    endLocationLng: String(lng),
                                 }));
                              }}
                           />
                           {routeForm.endLocationLat && (
                              <p className="text-[11px] text-red-700 font-bold">
                                 ✅ Coords: {parseFloat(routeForm.endLocationLat).toFixed(4)}, {parseFloat(routeForm.endLocationLng).toFixed(4)}
                              </p>
                           )}
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
