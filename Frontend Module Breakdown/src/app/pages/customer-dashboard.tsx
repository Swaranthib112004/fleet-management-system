import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./../lib/auth";
import { dashboardApi } from "../lib/api";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
    Package, MapPin, CheckCircle2, Clock, Truck, FileText,
    Search, Star, ArrowUpRight, ChevronRight, Eye, Bell,
    Activity, TrendingUp, MessageSquare, HelpCircle, Shield,
    Calendar, BarChart3, AlertCircle, Timer, Copy
} from "lucide-react";
import { cn } from "../lib/utils";

export function CustomerDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [data, setData] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [activeFilter, setActiveFilter] = React.useState<"all" | "transit" | "delivered" | "processing">("all");
    const [selectedShipment, setSelectedShipment] = React.useState<any>(null);

    React.useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const resp = await dashboardApi.getCustomerDashboard();
                setData(resp);
            } catch (err: any) {
                // Silently fall back to sample data
                console.warn("Failed to load customer dashboard:", err.message);
                // Fallback data
                setData({
                    shipments: [
                        { id: "1", trackingCode: "SH-1001", origin: "Mumbai Warehouse", destination: "Delhi Hub", status: "In Transit", eta: "Feb 27, 2:00 PM", distance: 1400, createdAt: new Date().toISOString() },
                        { id: "2", trackingCode: "SH-1002", origin: "Delhi Hub", destination: "Jaipur Center", status: "Processing", eta: "Feb 28, 10:00 AM", distance: 280, createdAt: new Date().toISOString() },
                        { id: "3", trackingCode: "SH-1003", origin: "Chennai Port", destination: "Bangalore DC", status: "Delivered", eta: "Delivered", distance: 350, createdAt: new Date(Date.now() - 86400000).toISOString() },
                    ],
                    stats: { totalShipments: 3, inTransit: 1, delivered: 1, processing: 1 },
                });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleTrackShipment = (shipment: any) => {
        setSelectedShipment(shipment);
        toast.info(`Tracking ${shipment.trackingCode}...`);
    };

    const handleCopyTracking = (code: string) => {
        navigator.clipboard.writeText(code).then(() => {
            toast.success(`Tracking code ${code} copied!`);
        }).catch(() => {
            toast.error("Failed to copy");
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Loading your shipments...</p>
                </div>
            </div>
        );
    }

    const shipments = data?.shipments || [];
    const stats = data?.stats || {};

    const filteredShipments = shipments.filter((s: any) => {
        const matchesSearch = searchQuery === "" ||
            s.trackingCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.destination?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesFilter =
            activeFilter === "all" ||
            (activeFilter === "transit" && s.status === "In Transit") ||
            (activeFilter === "delivered" && s.status === "Delivered") ||
            (activeFilter === "processing" && s.status === "Processing");

        return matchesSearch && matchesFilter;
    });

    const getStatusConfig = (status: string) => {
        switch (status) {
            case "In Transit": return { color: "bg-blue-50 text-blue-600 border-blue-200", icon: Truck, dot: "bg-blue-500" };
            case "Delivered": return { color: "bg-green-50 text-green-600 border-green-200", icon: CheckCircle2, dot: "bg-green-500" };
            case "Processing": return { color: "bg-amber-50 text-amber-600 border-amber-200", icon: Clock, dot: "bg-amber-500" };
            default: return { color: "bg-gray-50 text-gray-600 border-gray-200", icon: Package, dot: "bg-gray-500" };
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Shipments", value: stats.totalShipments || 0, icon: Package, color: "text-purple-600 bg-purple-50", accent: "border-purple-200", onClick: () => setActiveFilter("all") },
                    { label: "In Transit", value: stats.inTransit || 0, icon: Truck, color: "text-blue-600 bg-blue-50", accent: "border-blue-200", onClick: () => setActiveFilter("transit") },
                    { label: "Delivered", value: stats.delivered || 0, icon: CheckCircle2, color: "text-green-600 bg-green-50", accent: "border-green-200", onClick: () => setActiveFilter("delivered") },
                    { label: "Processing", value: stats.processing || 0, icon: Clock, color: "text-amber-600 bg-amber-50", accent: "border-amber-200", onClick: () => setActiveFilter("processing") },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        onClick={stat.onClick}
                        className={cn(
                            "bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer group",
                            stat.accent,
                            activeFilter !== "all" && stat.label.toLowerCase().includes(activeFilter) ? "ring-2 ring-blue-300" : ""
                        )}
                    >
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", stat.color)}>
                            <stat.icon size={20} />
                        </div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                        <p className="text-2xl font-extrabold text-gray-900 mt-1">{stat.value}</p>
                        <div className="mt-2 text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            Filter <ArrowUpRight size={12} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Search + Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by tracking code, origin, or destination..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-5 py-3.5 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all font-medium bg-white"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { navigate("/app/documents"); toast.info("Opening documents..."); }}
                        className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white border border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <FileText size={18} /> Documents
                    </button>
                    <button
                        onClick={() => { navigate("/app/routing"); toast.info("Opening tracking map..."); }}
                        className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-all shadow-md shadow-purple-100"
                    >
                        <MapPin size={18} /> Track Live
                    </button>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left: Shipments List */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                                    <Package size={18} />
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg">Your Shipments</h3>
                            </div>
                            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                                {(["all", "transit", "delivered", "processing"] as const).map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setActiveFilter(f)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize",
                                            activeFilter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                        )}
                                    >
                                        {f === "all" ? "All" : f === "transit" ? "In Transit" : f.charAt(0).toUpperCase() + f.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                            {filteredShipments.length === 0 ? (
                                <div className="px-6 py-16 text-center">
                                    <Package size={48} className="text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium">No shipments found</p>
                                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filter</p>
                                </div>
                            ) : (
                                filteredShipments.map((shipment: any, i: number) => {
                                    const config = getStatusConfig(shipment.status);
                                    const StatusIcon = config.icon;
                                    return (
                                        <motion.div
                                            key={shipment.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.06 }}
                                            className={cn(
                                                "px-6 py-5 hover:bg-gray-50/50 transition-colors cursor-pointer",
                                                selectedShipment?.id === shipment.id ? "bg-purple-50/30" : ""
                                            )}
                                            onClick={() => handleTrackShipment(shipment)}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border", config.color)}>
                                                        <StatusIcon size={22} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="font-bold text-gray-900">{shipment.trackingCode}</p>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleCopyTracking(shipment.trackingCode); }}
                                                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                                                title="Copy tracking code"
                                                            >
                                                                <Copy size={14} />
                                                            </button>
                                                            <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", config.color)}>
                                                                <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1", config.dot)} />
                                                                {shipment.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                                                            <MapPin size={14} className="text-gray-400 shrink-0" />
                                                            <span className="truncate">{shipment.origin}</span>
                                                            <span className="text-gray-400">→</span>
                                                            <span className="truncate font-medium">{shipment.destination}</span>
                                                        </div>
                                                        <div className="flex items-center gap-4 mt-2">
                                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                                <Timer size={12} /> ETA: {shipment.status === "Delivered" ? "Delivered" : shipment.eta}
                                                            </span>
                                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                                <MapPin size={12} /> {shipment.distance} km
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate("/app/routing");
                                                        toast.info(`Tracking ${shipment.trackingCode}...`);
                                                    }}
                                                    className="shrink-0 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-600 text-xs font-bold hover:bg-purple-100 transition-colors flex items-center gap-1"
                                                >
                                                    <Eye size={14} /> Track
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Selected Shipment Detail */}
                    <AnimatePresence>
                        {selectedShipment && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden"
                            >
                                <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <Eye size={18} className="text-purple-500" /> Shipment Details
                                    </h3>
                                    <button onClick={() => setSelectedShipment(null)} className="text-gray-400 hover:text-gray-600">
                                        <AlertCircle size={18} />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-gray-900">{selectedShipment.trackingCode}</p>
                                        <span className={cn("inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold border", getStatusConfig(selectedShipment.status).color)}>
                                            {selectedShipment.status}
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-0.5">
                                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Origin</p>
                                                <p className="text-sm font-bold text-gray-900">{selectedShipment.origin}</p>
                                            </div>
                                        </div>
                                        <div className="ml-3 w-0.5 h-6 bg-gray-200" />
                                        <div className="flex items-start gap-3">
                                            <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                                                <MapPin size={12} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Destination</p>
                                                <p className="text-sm font-bold text-gray-900">{selectedShipment.destination}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-gray-50 p-3 rounded-xl">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Distance</p>
                                            <p className="text-sm font-bold text-gray-900">{selectedShipment.distance} km</p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-xl">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">ETA</p>
                                            <p className="text-sm font-bold text-gray-900">{selectedShipment.status === "Delivered" ? "Done" : "Soon"}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => { navigate("/app/routing"); toast.info("Opening live tracking..."); }}
                                        className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <MapPin size={16} /> Track on Map
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
