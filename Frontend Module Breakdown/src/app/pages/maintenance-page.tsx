import React from "react";
import { Plus, Wrench, Calendar, Clock, CheckCircle2, AlertTriangle, Search, Filter, Download, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { maintenanceApi, remindersApi } from "../lib/api";
import type { MaintenanceLog, Reminder } from "../lib/types";

type MaintenanceFormData = Omit<MaintenanceLog, "id">;

const EMPTY_FORM: MaintenanceFormData = {
   vehicle: "",
   type: "",
   date: new Date().toISOString().slice(0, 10),
   cost: 0,
   mechanic: "",
   status: "Scheduled",
   notes: "",
};

export function MaintenancePage() {
   const [logs, setLogs] = React.useState<MaintenanceLog[]>([]);
   const [reminders, setReminders] = React.useState<Reminder[]>([]);
   const [activeView, setActiveView] = React.useState("logs");
   const [isModalOpen, setIsModalOpen] = React.useState(false);
   const [editingLog, setEditingLog] = React.useState<MaintenanceLog | null>(null);
   const [formData, setFormData] = React.useState<MaintenanceFormData>(EMPTY_FORM);
   const [searchTerm, setSearchTerm] = React.useState("");
   const [loadingData, setLoadingData] = React.useState(false);
   const [currentPage, setCurrentPage] = React.useState(1);
   const [totalPages, setTotalPages] = React.useState(1);
   const [totalCount, setTotalCount] = React.useState(0);
   const [currentDate, setCurrentDate] = React.useState(new Date());
   const pageSize = 10;

   // client-side filtering removed since server handles search/pagination

   const totalCost = logs.reduce((a, b) => a + b.cost, 0);
   const avgCost = logs.length > 0 ? Math.round(totalCost / logs.length) : 0;
   const budgetUsed = Math.min(100, Math.round((totalCost / 5000) * 100));

   const openAddModal = () => {
      setEditingLog(null);
      setFormData(EMPTY_FORM);
      setIsModalOpen(true);
   };

   const openEditModal = (log: MaintenanceLog) => {
      setEditingLog(log);
      setFormData({ ...log });
      setIsModalOpen(true);
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
         if (editingLog) {
            await maintenanceApi.update(editingLog.id, formData);
            toast.success("Maintenance log updated");
         } else {
            await maintenanceApi.create(formData);
            toast.success("Maintenance log added");
         }
         await reloadLogs();
      } catch (err: any) {
         toast.error(err.message || "Operation failed");
      } finally {
         setIsModalOpen(false);
      }
   };

   const handleDelete = async (id: string) => {
      if (!confirm("Delete this maintenance log?")) return;
      try {
         await maintenanceApi.delete(id);
         toast.error("Maintenance log deleted");
         await reloadLogs();
      } catch (err: any) {
         toast.error(err.message || "Delete failed");
      }
   };

   const handleFormChange = (field: keyof MaintenanceFormData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
   };

   const reloadLogs = async () => {
      setLoadingData(true);
      try {
         const resp: any = await maintenanceApi.getAll({
            page: currentPage,
            limit: pageSize,
            search: searchTerm,
         });
         const rawItems = Array.isArray(resp) ? resp : (resp.items || resp.maintenance || resp.data || []);
         const normalized = rawItems.map((item: any) => ({ ...item, id: item.id || item._id }));
         setLogs(normalized);
         if (resp.pages) setTotalPages(resp.pages);
         if (resp.total !== undefined) setTotalCount(resp.total);
      } catch (err: any) {
         // Silently fall back to empty list
         console.warn("Failed to load maintenance logs:", err.message);
         setLogs([]);
         setTotalPages(1);
         setTotalCount(0);
      } finally {
         setLoadingData(false);
      }
   };

   React.useEffect(() => {
      setCurrentPage(1);
   }, [searchTerm]);

   React.useEffect(() => {
      reloadLogs();
   }, [currentPage, searchTerm]);

   const loadReminders = async () => {
      try {
         const list = await remindersApi.getAll();
         const mapped = list.map((r: any) => ({
            id: r.id || r._id,
            title: r.title || r.message || 'Upcoming Reminder',
            vehicle: typeof r.vehicle === 'object' ? (r.vehicle?.registration || 'Vehicle') : (r.vehicle || 'Unknown'),
            date: r.date || (r.scheduleAt ? new Date(r.scheduleAt).toLocaleDateString() : ''),
            critical: r.critical || r.type === 'urgent' || r.type === 'critical'
         }));
         setReminders(mapped);
      } catch (err: any) {
         console.warn("Failed to load reminders:", err.message);
         setReminders([]);
      }
   };

   React.useEffect(() => {
      if (activeView === 'reminders') {
         loadReminders();
      }
   }, [activeView]);

   return (
      <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
               <h1 className="text-3xl font-bold tracking-tight text-gray-900">Maintenance & Reminders</h1>
               <p className="text-gray-500 font-medium">Keep your fleet in top condition with automated scheduling and tracking.</p>
            </div>
            <div className="flex items-center gap-3">
               <button
                  onClick={() => setActiveView("calendar")}
                  className={cn(
                     "flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold transition-all shadow-sm",
                     activeView === "calendar" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  )}>
                  <Calendar size={18} />
                  Calendar
               </button>
               <button
                  onClick={openAddModal}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
               >
                  <Plus size={18} />
                  Add Log
               </button>
            </div>
         </div>

         <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
               <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
                     {["logs", "calendar", "reminders"].map((v) => (
                        <button
                           key={v}
                           onClick={() => setActiveView(v)}
                           className={cn(
                              "px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all",
                              activeView === v ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                           )}
                        >
                           {v}
                        </button>
                     ))}
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 w-56">
                        <Search size={16} className="text-gray-400" />
                        <input
                           type="text"
                           placeholder="Search logs..."
                           className="bg-transparent border-none focus:ring-0 text-sm outline-none w-full"
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && <button onClick={() => setSearchTerm("")}><X size={14} className="text-gray-400" /></button>}
                     </div>
                  </div>
               </div>

               <div className="flex-1 overflow-x-auto">
                  {activeView === "logs" ? (
                     <table className="w-full text-left">
                        <thead>
                           <tr className="bg-gray-50/50 border-b border-gray-50">
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Asset / Type</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Mechanic</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cost</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                           {logs.length === 0 ? (
                              <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-400 font-medium">No maintenance logs found.</td></tr>
                           ) : (
                              logs.map((m) => (
                                 <tr key={m.id} className="hover:bg-gray-50/30 transition-all group">
                                    <td className="px-6 py-4">
                                       <div>
                                          <p className="font-bold text-gray-900">{m.vehicle}</p>
                                          <p className="text-xs font-bold text-blue-600 uppercase tracking-tighter">{m.type}</p>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-600 text-sm">{m.date}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-700">{m.mechanic}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900">${m.cost.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                       <span className={cn(
                                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                          m.status === "Completed" && "bg-green-50 text-green-600",
                                          m.status === "In Progress" && "bg-orange-50 text-orange-600",
                                          m.status === "Scheduled" && "bg-blue-50 text-blue-600",
                                       )}>{m.status}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => openEditModal(m)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"><Wrench size={16} /></button>
                                          <button onClick={() => handleDelete(m.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><X size={16} /></button>
                                       </div>
                                    </td>
                                 </tr>
                              ))
                           )}
                        </tbody>
                     </table>
                  ) : activeView === "calendar" ? (
                     <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                           <h3 className="text-lg font-bold text-gray-900">
                              {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                           </h3>
                           <div className="flex gap-2">
                              <button
                                 onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                                 className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 font-bold text-gray-700 transition"
                              >
                                 &lt;
                              </button>
                              <button
                                 onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                                 className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 font-bold text-gray-700 transition"
                              >
                                 &gt;
                              </button>
                           </div>
                        </div>
                        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                           {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                              <div key={d} className="bg-gray-50 p-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">{d}</div>
                           ))}
                           {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, i) => (
                              <div key={`blank-${i}`} className="bg-white/50 min-h-[100px] p-2"></div>
                           ))}
                           {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                              const day = i + 1;
                              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                              const dayLogs = logs.filter(l => l.date === dateStr);
                              const isToday = new Date().toISOString().slice(0, 10) === dateStr;

                              return (
                                 <div key={day} className={cn("bg-white min-h-[100px] p-2 border-t border-gray-50 transition-colors", isToday && "bg-blue-50/30")}>
                                    <span className={cn(
                                       "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mb-1",
                                       isToday ? "bg-blue-600 text-white" : "text-gray-500"
                                    )}>
                                       {day}
                                    </span>
                                    <div className="space-y-1">
                                       {dayLogs.map(l => (
                                          <div
                                             key={l.id}
                                             onClick={() => openEditModal(l)}
                                             className={cn(
                                                "text-[10px] font-bold px-2 py-1.5 rounded-lg truncate cursor-pointer transition flex flex-col gap-0.5 border",
                                                l.status === "Completed" ? "bg-green-50 text-green-700 border-green-100 hover:bg-green-100" :
                                                   l.status === "In Progress" ? "bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100" :
                                                      "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
                                             )}
                                             title={`${l.vehicle} - ${l.type}`}
                                          >
                                             <span>{l.vehicle}</span>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  ) : (
                     <div className="p-6 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Upcoming Reminders</h3>
                        {reminders.map((r) => (
                           <div key={r.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-all">
                              <div className="flex items-center gap-4">
                                 <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", r.critical ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500")}>
                                    <AlertTriangle size={18} />
                                 </div>
                                 <div>
                                    <p className="font-bold text-gray-900 text-sm">{r.title}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{r.vehicle}</p>
                                 </div>
                              </div>
                              <span className={cn("text-xs font-bold px-3 py-1 rounded-full", r.critical ? "bg-red-500 text-white" : "bg-gray-200 text-gray-600")}>{r.date}</span>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>

            <div className="space-y-8">
               <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-200">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-6"><AlertTriangle size={24} /></div>
                  <h3 className="text-2xl font-bold mb-2">{reminders.length} Due Reminders</h3>
                  <p className="text-blue-100 font-medium mb-8 leading-relaxed">Insurance renewals and safety inspections are pending for the West Fleet.</p>
                  <div className="space-y-4">
                     {reminders.map((r, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
                           <div>
                              <p className="font-bold text-sm leading-none mb-1">{r.title}</p>
                              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">{r.vehicle}</p>
                           </div>
                           <span className={cn("text-xs font-bold px-3 py-1 rounded-full bg-white/20", r.critical && "bg-red-500")}>{r.date}</span>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="font-bold text-gray-900">Cost Summary</h3>
                     <button
                        onClick={() => {
                           const csv = ["Asset/Type,Date,Mechanic,Cost,Status\n"]
                              .concat(logs.map(m => `"${m.vehicle} - ${m.type}","${m.date}","${m.mechanic}",${m.cost},"${m.status}"`))
                              .join("\n");
                           const blob = new Blob([csv], { type: "text/csv" });
                           const url = URL.createObjectURL(blob);
                           const a = document.createElement("a");
                           a.href = url;
                           a.download = "maintenance_costs.csv";
                           a.click();
                           URL.revokeObjectURL(url);
                           toast.success("Cost Summary CSV exported");
                        }}
                        className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-all"><Download size={18} /></button>
                  </div>
                  <div className="space-y-6">
                     <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium text-sm">Monthly Spend</span>
                        <span className="font-bold text-gray-900 text-lg">${totalCost.toLocaleString()}</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium text-sm">Avg. Cost / Log</span>
                        <span className="font-bold text-gray-900 text-lg">${avgCost.toLocaleString()}</span>
                     </div>
                     <div className="w-full bg-gray-50 h-3 rounded-full overflow-hidden border border-gray-100">
                        <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${budgetUsed}%` }} />
                     </div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center italic">{budgetUsed}% of budget utilized this month</p>
                  </div>
               </div>
            </div>
         </div>

         {/* Add/Edit Maintenance Modal */}
         <AnimatePresence>
            {isModalOpen && (
               <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                  <motion.div
                     initial={{ scale: 0.95, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     exit={{ scale: 0.95, opacity: 0 }}
                     className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
                     onClick={(e) => e.stopPropagation()}
                  >
                     <div className="flex justify-between items-start mb-8">
                        <div>
                           <h2 className="text-2xl font-bold">{editingLog ? "Edit Maintenance Log" : "Add Maintenance Log"}</h2>
                           <p className="text-gray-500 font-medium">Record service details and costs.</p>
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                     </div>

                     <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Vehicle Registration</label>
                              <input type="text" required placeholder="e.g. VOL-2024-X" value={formData.vehicle} onChange={(e) => handleFormChange("vehicle", e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium" />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Service Type</label>
                              <input type="text" required placeholder="e.g. Oil Change" value={formData.type} onChange={(e) => handleFormChange("type", e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium" />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Date</label>
                              <input type="date" required value={formData.date} onChange={(e) => handleFormChange("date", e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium" />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Cost ($)</label>
                              <input type="number" required min="0" value={formData.cost} onChange={(e) => handleFormChange("cost", Number(e.target.value))} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium" />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Mechanic / Vendor</label>
                              <input type="text" required placeholder="e.g. City Garage" value={formData.mechanic} onChange={(e) => handleFormChange("mechanic", e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium" />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Status</label>
                              <select value={formData.status} onChange={(e) => handleFormChange("status", e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium appearance-none">
                                 <option>Scheduled</option>
                                 <option>In Progress</option>
                                 <option>Completed</option>
                              </select>
                           </div>
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Notes</label>
                           <textarea rows={3} placeholder="Additional details..." value={formData.notes} onChange={(e) => handleFormChange("notes", e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium resize-none" />
                        </div>
                        <div className="pt-6 border-t border-gray-100 flex gap-4">
                           <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-2xl border border-gray-200 font-bold hover:bg-gray-50 transition-all">Cancel</button>
                           <button type="submit" className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">
                              {editingLog ? "Save Changes" : "Add Log"}
                           </button>
                        </div>
                     </form>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>
      </div>
   );
}
