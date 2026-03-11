import React from "react";
import {
   Settings as SettingsIcon,
   User,
   Bell,
   Shield,
   Database,
   LogOut,
   Key,
   Globe,
   Clock,
   FileSearch,
   CheckCircle2,
   Trash2,
   Edit2,
   Plus,
   X,
   Save,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { notificationsApi, rolesApi, auditApi } from "../lib/api";
import type { NotificationSetting, Role, AuditLog } from "../lib/types";

const TABS = [
   { id: "general", label: "General", icon: Globe },
   // { id: "roles", label: "User Roles", icon: User },
   { id: "notifications", label: "Notifications", icon: Bell },
   { id: "security", label: "Security", icon: Shield },
   { id: "audit", label: "Audit Logs", icon: FileSearch },
];

export function SettingsPage() {
   const [activeTab, setActiveTab] = React.useState("general");
   const [notifications, setNotifications] = React.useState<NotificationSetting[]>([]);
   const [roles, setRoles] = React.useState<Role[]>([]);
   const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([]);
   const [auditFilter, setAuditFilter] = React.useState("");
   const [auditActionFilter, setAuditActionFilter] = React.useState("");
   const [auditUserFilter, setAuditUserFilter] = React.useState("");
   const [auditDateFrom, setAuditDateFrom] = React.useState("");
   const [auditDateTo, setAuditDateTo] = React.useState("");
   const [loadingData, setLoadingData] = React.useState(false);

   // General settings
   const [generalSettings, setGeneralSettings] = React.useState({
      companyName: "FleetPro Logistics",
      timezone: "UTC",
      currency: "USD",
      dateFormat: "YYYY-MM-DD",
   });

   // Security settings
   const [securitySettings, setSecuritySettings] = React.useState({
      minPasswordLength: 12,
      require2FA: true,
   });

   // Role modal
   const [isRoleModalOpen, setIsRoleModalOpen] = React.useState(false);
   const [roleForm, setRoleForm] = React.useState({ name: "", count: 0, perms: "" });

   const handleToggleNotification = async (id: string) => {
      try {
         const updated = await notificationsApi.toggle(id);
         setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)));
         toast.success(`${updated.label} ${updated.enabled ? "enabled" : "disabled"}`);
      } catch (err: any) {
         toast.error(err.message || "Unable to toggle notification");
      }
   };

   const handleSaveGeneral = () => {
      toast.success("Settings saved successfully");
   };

   const handleAddRole = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
         await rolesApi.create(roleForm);
         toast.success("Role added");
         await reloadRoles();
      } catch (err: any) {
         toast.error(err.message || "Failed to add role");
      } finally {
         setIsRoleModalOpen(false);
         setRoleForm({ name: "", count: 0, perms: "" });
      }
   };

   const handleDeleteRole = async (id: string) => {
      if (!confirm("Delete this role?")) return;
      try {
         await rolesApi.delete(id);
         toast.error("Role deleted");
         await reloadRoles();
      } catch (err: any) {
         toast.error(err.message || "Delete failed");
      }
   };

   const getUserName = (user: AuditLog['user']): string =>
      typeof user === 'object' ? (user?.name || user?.email || 'System') : (user || 'System');

   const auditActionOptions = React.useMemo(() => {
      const set = new Set(auditLogs.map(l => (l.action || '').trim()).filter(Boolean));
      return ['', ...Array.from(set).sort()];
   }, [auditLogs]);

   const auditUserOptions = React.useMemo(() => {
      const set = new Set(auditLogs.map(l => getUserName(l.user)).filter(Boolean));
      return ['', ...Array.from(set).sort()];
   }, [auditLogs]);

   const filteredAuditLogs = auditLogs.filter((log) => {
      const userName = getUserName(log.user).toLowerCase();
      const action = (log.action || '').toLowerCase();
      const target = (log.target || '').toLowerCase();

      if (auditFilter) {
         const q = auditFilter.toLowerCase();
         if (!userName.includes(q) && !action.includes(q) && !target.includes(q)) return false;
      }
      if (auditActionFilter && (log.action || '') !== auditActionFilter) return false;
      if (auditUserFilter && getUserName(log.user) !== auditUserFilter) return false;
      if (auditDateFrom) {
         const d = log.createdAt ? new Date(log.createdAt).toISOString().slice(0, 10) : '';
         if (d < auditDateFrom) return false;
      }
      if (auditDateTo) {
         const d = log.createdAt ? new Date(log.createdAt).toISOString().slice(0, 10) : '';
         if (d > auditDateTo) return false;
      }
      return true;
   });

   const reloadNotifications = async () => {
      try {
         const list = await notificationsApi.getAll();
         setNotifications(list);
      } catch (err: any) {
         console.warn("Failed to load notifications:", err.message);
         setNotifications([]);
      }
   };
   const reloadRoles = async () => {
      try {
         const list = await rolesApi.getAll();
         setRoles(list);
      } catch (err: any) {
         console.warn("Failed to load roles:", err.message);
         setRoles([]);
      }
   };
   const reloadAudit = async () => {
      try {
         const list = await auditApi.getAll();
         setAuditLogs(list);
      } catch (err: any) {
         console.warn("Failed to load audit logs:", err.message);
         setAuditLogs([]);
      }
   };

   React.useEffect(() => {
      setLoadingData(true);
      Promise.all([reloadNotifications(), reloadRoles(), reloadAudit()])
         .finally(() => setLoadingData(false));
   }, []);

   return (
      <div className="space-y-8 max-w-[1200px] mx-auto pb-10">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
               <h1 className="text-3xl font-bold tracking-tight text-gray-900">System Settings</h1>
               <p className="text-gray-500 font-medium">Configure global system behavior and manage administrative controls.</p>
            </div>
            <button
               onClick={handleSaveGeneral}
               className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
            >
               <Save size={18} />
               Save All Changes
            </button>
         </div>

         <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar Tabs */}
            <aside className="md:w-64 flex flex-col gap-1">
               {TABS.map((tab) => (
                  <button
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id)}
                     className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                        activeTab === tab.id ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-500 hover:bg-gray-100"
                     )}
                  >
                     <tab.icon size={18} />
                     {tab.label}
                  </button>
               ))}
            </aside>

            {/* Settings Content */}
            <div className="flex-1 space-y-8">
               {activeTab === "general" && (
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                     <div>
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Globe size={20} className="text-blue-600" /> Organization Profile</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                           <SettingsInput label="Company Name" value={generalSettings.companyName} onChange={(v) => setGeneralSettings((p) => ({ ...p, companyName: v }))} />
                           <SettingsInput label="Timezone" value={generalSettings.timezone} type="select" options={["UTC", "PST", "EST", "CET", "IST"]} onChange={(v) => setGeneralSettings((p) => ({ ...p, timezone: v }))} />
                           <SettingsInput label="Currency" value={generalSettings.currency} type="select" options={["USD", "EUR", "GBP", "INR"]} onChange={(v) => setGeneralSettings((p) => ({ ...p, currency: v }))} />
                           <SettingsInput label="Date Format" value={generalSettings.dateFormat} type="select" options={["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]} onChange={(v) => setGeneralSettings((p) => ({ ...p, dateFormat: v }))} />
                        </div>
                     </div>
                     <div className="pt-8 border-t border-gray-50">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Database size={20} className="text-blue-600" /> Data Management</h3>
                        <div className="space-y-4">
                           <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                              <div>
                                 <p className="font-bold text-sm">System Backups</p>
                                 <p className="text-xs text-gray-500 font-medium mt-1">Automatically backup database every 24 hours.</p>
                              </div>
                              <button onClick={() => toast.success("Backup snapshot downloading...")} className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold hover:bg-white transition-all">Download Snapshot</button>
                           </div>
                           <div className="p-6 rounded-2xl bg-red-50/30 border border-red-100 flex items-center justify-between">
                              <div>
                                 <p className="font-bold text-sm text-red-600">Danger Zone</p>
                                 <p className="text-xs text-red-500 font-medium mt-1">Permanent data deletion cannot be undone.</p>
                              </div>
                              <button
                                 onClick={() => {
                                    if (confirm("This will permanently delete all data. Are you sure?")) {
                                       toast.error("Database cleared (mock only)");
                                    }
                                 }}
                                 className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all"
                              >
                                 Clear Database
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {activeTab === "roles" && (
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold">Role Management</h3>
                        <button onClick={() => setIsRoleModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"><Plus size={14} />Add New Role</button>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead>
                              <tr className="border-b border-gray-50">
                                 <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Role Name</th>
                                 <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Users</th>
                                 <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Permissions</th>
                                 <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-50">
                              {roles.map((role) => (
                                 <tr key={role.id} className="hover:bg-gray-50/50 group transition-all">
                                    <td className="py-4 font-bold text-gray-900">{role.name}</td>
                                    <td className="py-4 text-sm font-semibold text-gray-500">{role.count} Active</td>
                                    <td className="py-4 text-sm font-semibold text-blue-600">{role.perms}</td>
                                    <td className="py-4 text-right">
                                       <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => handleDeleteRole(role.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                                       </div>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               {activeTab === "notifications" && (
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                     <h3 className="text-xl font-bold mb-6">Alert Preferences</h3>
                     {notifications.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-50 hover:border-blue-100 transition-all">
                           <div>
                              <p className="font-bold text-sm">{item.label}</p>
                              <p className="text-xs text-gray-500 font-medium mt-0.5">{item.desc}</p>
                           </div>
                           <button
                              onClick={() => handleToggleNotification(item.id)}
                              className={cn(
                                 "w-12 h-6 rounded-full transition-all relative flex items-center px-1 cursor-pointer",
                                 item.enabled ? "bg-blue-600" : "bg-gray-200"
                              )}
                           >
                              <div className={cn("w-4 h-4 rounded-full bg-white shadow-sm transition-all", item.enabled ? "translate-x-6" : "translate-x-0")} />
                           </button>
                        </div>
                     ))}
                  </div>
               )}

               {/* Removed roles tab and management UI */}
               <div>
                  <input type="checkbox" id="mfa" />
                  <label htmlFor="mfa" className="text-sm font-bold text-gray-700 cursor-pointer">Require Two-Factor Authentication (2FA)</label>
               </div>

               {activeTab === "audit" && (
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="text-xl font-bold">Audit Logs</h3>
                        <div className="flex flex-wrap gap-2 items-center">
                           <select value={auditActionFilter} onChange={(e) => setAuditActionFilter(e.target.value)} className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold bg-gray-50 focus:bg-white focus:border-blue-300 outline-none">
                              <option value="">All actions</option>
                              {auditActionOptions.filter(Boolean).map((a) => <option key={a} value={a}>{a}</option>)}
                           </select>
                           <select value={auditUserFilter} onChange={(e) => setAuditUserFilter(e.target.value)} className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold bg-gray-50 focus:bg-white focus:border-blue-300 outline-none min-w-[100px]">
                              <option value="">All users</option>
                              {auditUserOptions.filter(Boolean).map((u) => <option key={u} value={u}>{u}</option>)}
                           </select>
                           <input type="date" value={auditDateFrom} onChange={(e) => setAuditDateFrom(e.target.value)} className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold bg-gray-50 focus:bg-white focus:border-blue-300 outline-none" placeholder="From" />
                           <input type="date" value={auditDateTo} onChange={(e) => setAuditDateTo(e.target.value)} className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold bg-gray-50 focus:bg-white focus:border-blue-300 outline-none" placeholder="To" />
                           <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 w-48">
                              <FileSearch size={14} className="text-gray-400 shrink-0" />
                              <input type="text" placeholder="Search..." value={auditFilter} onChange={(e) => setAuditFilter(e.target.value)} className="bg-transparent border-none focus:ring-0 text-xs outline-none w-full" />
                              {(auditFilter || auditActionFilter || auditUserFilter || auditDateFrom || auditDateTo) && (
                                 <button onClick={() => { setAuditFilter(""); setAuditActionFilter(""); setAuditUserFilter(""); setAuditDateFrom(""); setAuditDateTo(""); }} className="shrink-0 text-gray-400 hover:text-gray-600"><X size={12} /></button>
                              )}
                           </div>
                        </div>
                     </div>
                     <div className="space-y-4">
                        {filteredAuditLogs.length === 0 ? (
                           <p className="text-center text-gray-400 font-medium py-8">
                              {(auditFilter || auditActionFilter || auditUserFilter || auditDateFrom || auditDateTo) ? "No audit logs match the current filters." : "No audit logs yet."}
                           </p>
                        ) : (
                           filteredAuditLogs.map((log) => (
                              <div key={log.id} className="flex items-center justify-between text-xs py-2 border-b border-gray-50">
                                 <div className="flex items-center gap-3">
                                    <span className="font-bold text-gray-900">{getUserName(log.user)}</span>
                                    <span className={cn(
                                       "px-2 py-0.5 rounded uppercase tracking-tighter font-extrabold",
                                       (log.action || '').includes("Delete") || (log.action || '').includes("delete") ? "bg-red-50 text-red-600" :
                                          (log.action || '').includes("Creat") || (log.action || '').includes("Add") ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                                    )}>{log.action}</span>
                                    <span className="text-gray-400 font-bold">{log.target || ''}</span>
                                 </div>
                                 <span className="text-gray-400 font-bold">{log.createdAt ? new Date(log.createdAt).toLocaleDateString() : ''}</span>
                              </div>
                           ))
                        )}
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* Add Role Modal */}
         <AnimatePresence>
            {isRoleModalOpen && (
               <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsRoleModalOpen(false)}>
                  <motion.div
                     initial={{ scale: 0.95, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     exit={{ scale: 0.95, opacity: 0 }}
                     className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8"
                     onClick={(e) => e.stopPropagation()}
                  >
                     <div className="flex justify-between items-start mb-8">
                        <h2 className="text-2xl font-bold">Add New Role</h2>
                        <button onClick={() => setIsRoleModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                     </div>
                     <form className="space-y-5" onSubmit={handleAddRole}>
                        <div className="space-y-1.5">
                           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Role Name</label>
                           <input type="text" required placeholder="e.g. Dispatcher" value={roleForm.name} onChange={(e) => setRoleForm((p) => ({ ...p, name: e.target.value }))} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium" />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Permissions Description</label>
                           <input type="text" required placeholder="e.g. Fleet & Routing" value={roleForm.perms} onChange={(e) => setRoleForm((p) => ({ ...p, perms: e.target.value }))} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium" />
                        </div>
                        <div className="pt-4 flex gap-4">
                           <button type="button" onClick={() => setIsRoleModalOpen(false)} className="flex-1 py-4 rounded-2xl border border-gray-200 font-bold hover:bg-gray-50 transition-all">Cancel</button>
                           <button type="submit" className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">Add Role</button>
                        </div>
                     </form>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>
      </div>
   );
}

function SettingsInput({ label, value, type = "text", options, onChange }: { label: string; value: string; type?: string; options?: string[]; onChange: (v: string) => void }) {
   return (
      <div className="space-y-1.5 flex-1">
         <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{label}</label>
         {type === "select" ? (
            <select
               value={value}
               onChange={(e) => onChange(e.target.value)}
               className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-semibold text-gray-900 appearance-none"
            >
               {options!.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
         ) : (
            <input
               type={type}
               value={value}
               onChange={(e) => onChange(e.target.value)}
               className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-semibold text-gray-900"
            />
         )}
      </div>
   );
}
