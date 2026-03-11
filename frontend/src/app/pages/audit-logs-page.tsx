import React from "react";
import { RefreshCw, Search, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { auditApi } from "../lib/api";
import type { AuditLog } from "../lib/types";
import { useAuth } from "../lib/auth";

const POLL_INTERVAL_MS = 4000;

export function AuditLogsPage() {
   const { user } = useAuth();
   const [logs, setLogs] = React.useState<AuditLog[]>([]);
   const [loading, setLoading] = React.useState(true);
   const [lastFetched, setLastFetched] = React.useState<Date | null>(null);
   const [actionFilter, setActionFilter] = React.useState("");
   const [dateFrom, setDateFrom] = React.useState("");
   const [dateTo, setDateTo] = React.useState("");
   const [search, setSearch] = React.useState("");

   const getUserName = (user: AuditLog["user"]): string =>
      typeof user === "object" ? (user?.name || user?.email || "System") : (user || "System");

   const loadLogs = React.useCallback(async () => {
      try {
         const res: any = await auditApi.getAll();
         // Robust handling of API response shapes: array, {audit:[]}, {logs:[]}, or {data:[]}
         const list = Array.isArray(res) 
            ? res 
            : (res?.audit || res?.logs || res?.data || []);
         setLogs(list);
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

   const filtered = logs.filter((log) => {
      const logUser = log.user;
      const logUserName = getUserName(logUser).toLowerCase();
      // Also check email if logUser is an object
      const logUserEmail = (typeof logUser === 'object' && logUser?.email) ? logUser.email.toLowerCase() : "";

      const currentName = (user?.name || "").toLowerCase();
      const currentEmail = (user?.email || "").toLowerCase();

      // "Respective logs" logic:
      // Match if the log user matches the current user's name or email.
      // Using substring matching for name to handle "Swaranthi" vs "Swaranthi B".
      const isMatch = (currentName && logUserName.includes(currentName)) || 
                      (logUserName && currentName.includes(logUserName)) ||
                      (currentEmail && logUserEmail === currentEmail);

      if (!isMatch) return false;

      const action = (log.action || "").toLowerCase();
      const target = (log.target || "").toLowerCase();
      
      if (search) {
         const q = search.toLowerCase();
         if (!logUserName.includes(q) && !action.includes(q) && !target.includes(q)) return false;
      }
      if (actionFilter && (log.action || "") !== actionFilter) return false;
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
      if (a.includes("delet") || a.includes("cancel")) return "bg-red-50 text-red-600 border border-red-200";
      if (a.includes("creat") || a.includes("add") || a.includes(" complet")) return "bg-emerald-50 text-emerald-600 border border-emerald-200";
      if (a.includes("updat") || a.includes("reschedul") || a.includes("optimiz")) return "bg-blue-50 text-blue-600 border border-blue-200";
      return "bg-gray-50 text-gray-600 border border-gray-200";
   };

   const hasFilters = search || actionFilter || dateFrom || dateTo;

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
         <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-white/70 backdrop-blur-xl border border-gray-200/80 shadow-sm">
            <select
               value={actionFilter}
               onChange={(e) => setActionFilter(e.target.value)}
               className="px-3 py-2 rounded-xl border border-gray-200/80 text-sm font-medium bg-white/80 backdrop-blur-sm focus:border-blue-300 outline-none hover:border-gray-300 transition-all"
            >
               <option value="">All actions</option>
               {actionOptions.filter(Boolean).map((a) => (
                  <option key={a} value={a}>{a}</option>
               ))}
            </select>
            <input
               type="date"
               value={dateFrom}
               onChange={(e) => setDateFrom(e.target.value)}
               className="px-3 py-2 rounded-xl border border-gray-200/80 text-sm font-medium bg-white/80 backdrop-blur-sm focus:border-blue-300 outline-none hover:border-gray-300 transition-all"
               placeholder="From"
            />
            <input
               type="date"
               value={dateTo}
               onChange={(e) => setDateTo(e.target.value)}
               className="px-3 py-2 rounded-xl border border-gray-200/80 text-sm font-medium bg-white/80 backdrop-blur-sm focus:border-blue-300 outline-none hover:border-gray-300 transition-all"
               placeholder="To"
            />
            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
               <Search size={16} className="text-gray-400 shrink-0" />
               <input
                  type="text"
                  placeholder="Search user, action, or target..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200/80 text-sm font-medium bg-white/80 backdrop-blur-sm focus:border-blue-300 outline-none hover:border-gray-300 transition-all"
               />
               {hasFilters && (
                  <button
                     onClick={() => { setSearch(""); setActionFilter(""); setDateFrom(""); setDateTo(""); }}
                     className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white border border-transparent hover:border-gray-200 transition-all"
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
            className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-gray-200/80 shadow-sm overflow-hidden"
         >
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">User</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Target</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/80">
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
                              className="hover:bg-blue-50/20 transition-colors group cursor-default"
                           >
                              <td className="px-6 py-4 text-sm font-semibold text-gray-400 whitespace-nowrap">
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
                                 <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-tight", getActionBadgeClass(log.action || ""))}>
                                    {log.action || "—"}
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-gray-600">{log.target || "—"}</td>
                           </motion.tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
            {filtered.length > 0 && (
               <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/40 text-sm font-bold text-gray-400">
                  Showing {filtered.length} of {logs.length} logs
                  {hasFilters && " (filtered)"}
               </div>
            )}
         </motion.div>
      </div>
   );
}
