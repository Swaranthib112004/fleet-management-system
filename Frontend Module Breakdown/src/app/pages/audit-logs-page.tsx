import React from "react";
import { RefreshCw, Search, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { auditApi } from "../lib/api";
import type { AuditLog } from "../lib/types";

const POLL_INTERVAL_MS = 4000;

export function AuditLogsPage() {
   const [logs, setLogs] = React.useState<AuditLog[]>([]);
   const [loading, setLoading] = React.useState(true);
   const [lastFetched, setLastFetched] = React.useState<Date | null>(null);
   const [actionFilter, setActionFilter] = React.useState("");
   const [userFilter, setUserFilter] = React.useState("");
   const [dateFrom, setDateFrom] = React.useState("");
   const [dateTo, setDateTo] = React.useState("");
   const [search, setSearch] = React.useState("");

   const getUserName = (user: AuditLog["user"]): string =>
      typeof user === "object" ? (user?.name || user?.email || "System") : (user || "System");

   const loadLogs = React.useCallback(async () => {
      try {
         const list = await auditApi.getAll();
         setLogs(Array.isArray(list) ? list : (list?.audit || list?.logs || []));
         setLastFetched(new Date());
      } catch (err: any) {
         console.warn("Failed to load audit logs:", err?.message);
         setLogs([]);
      } finally {
         setLoading(false);
      }
   }, []);

   React.useEffect(() => {
      loadLogs();
      const interval = setInterval(loadLogs, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
   }, [loadLogs]);

   const actionOptions = React.useMemo(() => {
      const set = new Set(logs.map((l) => (l.action || "").trim()).filter(Boolean));
      return ["", ...Array.from(set).sort()];
   }, [logs]);

   const userOptions = React.useMemo(() => {
      const set = new Set(logs.map((l) => getUserName(l.user)).filter(Boolean));
      return ["", ...Array.from(set).sort()];
   }, [logs]);

   const filtered = logs.filter((log) => {
      const userName = getUserName(log.user).toLowerCase();
      const action = (log.action || "").toLowerCase();
      const target = (log.target || "").toLowerCase();
      if (search) {
         const q = search.toLowerCase();
         if (!userName.includes(q) && !action.includes(q) && !target.includes(q)) return false;
      }
      if (actionFilter && (log.action || "") !== actionFilter) return false;
      if (userFilter && getUserName(log.user) !== userFilter) return false;
      if (dateFrom) {
         const d = log.createdAt ? new Date(log.createdAt).toISOString().slice(0, 10) : "";
         if (d < dateFrom) return false;
      }
      if (dateTo) {
         const d = log.createdAt ? new Date(log.createdAt).toISOString().slice(0, 10) : "";
         if (d > dateTo) return false;
      }
      return true;
   });

   const getActionBadgeClass = (action: string) => {
      const a = (action || "").toLowerCase();
      if (a.includes("delet") || a.includes("cancel")) return "bg-red-50 text-red-600";
      if (a.includes("creat") || a.includes("add") || a.includes(" complet")) return "bg-green-50 text-green-600";
      if (a.includes("updat") || a.includes("reschedul") || a.includes("optimiz")) return "bg-blue-50 text-blue-600";
      return "bg-gray-50 text-gray-600";
   };

   const hasFilters = search || actionFilter || userFilter || dateFrom || dateTo;

   return (
      <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
               <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900">Audit Logs</h1>
                  <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold">
                     <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                     Live
                  </span>
               </div>
               <p className="text-gray-500 font-medium mt-1">Real-time view of all system operations. Auto-refreshes every 4 seconds.</p>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-xs text-gray-400 font-medium">
                  Last updated: {lastFetched ? lastFetched.toLocaleTimeString() : "—"}
               </span>
               <button
                  onClick={() => { setLoading(true); loadLogs(); }}
                  disabled={loading}
                  className={cn(
                     "flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold transition-all",
                     loading ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"
                  )}
               >
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                  Refresh
               </button>
            </div>
         </div>

         {/* Filters */}
         <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
            <select
               value={actionFilter}
               onChange={(e) => setActionFilter(e.target.value)}
               className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium bg-white focus:border-blue-300 outline-none"
            >
               <option value="">All actions</option>
               {actionOptions.filter(Boolean).map((a) => (
                  <option key={a} value={a}>{a}</option>
               ))}
            </select>
            <select
               value={userFilter}
               onChange={(e) => setUserFilter(e.target.value)}
               className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium bg-white focus:border-blue-300 outline-none min-w-[120px]"
            >
               <option value="">All users</option>
               {userOptions.filter(Boolean).map((u) => (
                  <option key={u} value={u}>{u}</option>
               ))}
            </select>
            <input
               type="date"
               value={dateFrom}
               onChange={(e) => setDateFrom(e.target.value)}
               className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium bg-white focus:border-blue-300 outline-none"
               placeholder="From"
            />
            <input
               type="date"
               value={dateTo}
               onChange={(e) => setDateTo(e.target.value)}
               className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium bg-white focus:border-blue-300 outline-none"
               placeholder="To"
            />
            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
               <Search size={16} className="text-gray-400 shrink-0" />
               <input
                  type="text"
                  placeholder="Search user, action, or target..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium bg-white focus:border-blue-300 outline-none"
               />
               {hasFilters && (
                  <button
                     onClick={() => { setSearch(""); setActionFilter(""); setUserFilter(""); setDateFrom(""); setDateTo(""); }}
                     className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white transition-colors"
                     title="Clear filters"
                  >
                     <X size={16} />
                  </button>
               )}
            </div>
         </div>

         {/* Logs table */}
         <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden"
         >
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Target</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                     {loading && logs.length === 0 ? (
                        <tr>
                           <td colSpan={4} className="px-6 py-16 text-center">
                              <div className="flex flex-col items-center gap-3">
                                 <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                 <p className="text-gray-500 font-medium">Loading audit logs...</p>
                              </div>
                           </td>
                        </tr>
                     ) : filtered.length === 0 ? (
                        <tr>
                           <td colSpan={4} className="px-6 py-16 text-center text-gray-500 font-medium">
                              {hasFilters ? "No audit logs match the current filters." : "No audit logs yet. Operations will appear here as you use the system."}
                           </td>
                        </tr>
                     ) : (
                        filtered.map((log, i) => (
                           <motion.tr
                              key={log.id || i}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: Math.min(i * 0.02, 0.3) }}
                              className="hover:bg-gray-50/50 transition-colors group"
                           >
                              <td className="px-6 py-4 text-sm font-medium text-gray-500 whitespace-nowrap">
                                 {log.createdAt
                                    ? new Date(log.createdAt).toLocaleString(undefined, {
                                         dateStyle: "short",
                                         timeStyle: "medium",
                                      })
                                    : "—"}
                              </td>
                              <td className="px-6 py-4">
                                 <span className="font-bold text-gray-900">{getUserName(log.user)}</span>
                              </td>
                              <td className="px-6 py-4">
                                 <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-tighter", getActionBadgeClass(log.action || ""))}>
                                    {log.action || "—"}
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-gray-600">{log.target || "—"}</td>
                           </motion.tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
            {filtered.length > 0 && (
               <div className="px-6 py-4 border-t border-gray-50 bg-gray-50/30 text-sm font-bold text-gray-500">
                  Showing {filtered.length} of {logs.length} logs
                  {hasFilters && " (filtered)"}
               </div>
            )}
         </motion.div>
      </div>
   );
}
