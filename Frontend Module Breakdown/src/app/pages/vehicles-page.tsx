import React from "react";
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  Truck,
  Car,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { vehiclesApi, driversApi, auditApi } from "../lib/api";
import type { Vehicle, Driver } from "../lib/types";

type VehicleFormData = Omit<Vehicle, "id">;

const EMPTY_FORM: VehicleFormData = {
  registration: "",
  make: "",
  model: "",
  year: new Date().getFullYear(),
  type: "Van",
  fuel: "Diesel",
  mileage: 0,
  status: "Active",
  driver: "Unassigned",
  lastService: new Date().toISOString().slice(0, 10),
};

export function VehiclesPage() {
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [loadingData, setLoadingData] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingVehicle, setEditingVehicle] = React.useState<Vehicle | null>(null);
  const [viewingVehicle, setViewingVehicle] = React.useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("All");
  const [formData, setFormData] = React.useState<VehicleFormData>(EMPTY_FORM);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const pageSize = 5;

  const [globalStats, setGlobalStats] = React.useState({
    total: 0,
    active: 0,
    maintenance: 0,
    inactive: 0,
  });

  const [drivers, setDrivers] = React.useState<Driver[]>([]);

  // ----- Handlers -----
  const openAddModal = () => {
    setEditingVehicle(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({ ...vehicle });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        await vehiclesApi.update(editingVehicle.id, formData);
        // Audit log for update
        try {
          await auditApi.add({
            action: "vehicle_updated",
            target: editingVehicle.registration,
            user: "current", // backend will enrich user from token if supported
            createdAt: new Date().toISOString(),
          } as any);
        } catch {
          // best-effort; don't block main flow
        }
        toast.success(`Vehicle ${formData.registration} updated successfully`);
      } else {
        const created = await vehiclesApi.create(formData);
        // Audit log for create
        try {
          await auditApi.add({
            action: "vehicle_created",
            target: created.registration,
            user: "current",
            createdAt: new Date().toISOString(),
          } as any);
        } catch {
          //
        }
        toast.success(`Vehicle ${formData.registration} registered successfully`);
      }
      await reloadVehicles();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    } finally {
      setIsModalOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      const existing = vehicles.find(v => v.id === id);
      await vehiclesApi.delete(id);
      // Audit log for delete
      try {
        await auditApi.add({
          action: "vehicle_deleted",
          target: existing?.registration || id,
          user: "current",
          createdAt: new Date().toISOString(),
        } as any);
      } catch {
        //
      }
      toast.error("Vehicle deleted");
      await reloadVehicles();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  const handleFormChange = (field: keyof VehicleFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Single effect — runs whenever any filter/page changes.
  // reloadVehicles accepts explicit params to avoid stale-closure bugs
  // where two effects firing simultaneously would send the wrong page number.
  const reloadVehicles = async (page = currentPage, search = searchTerm, filter = statusFilter) => {
    setLoadingData(true);
    try {
      const resp: any = await vehiclesApi.getAll({
        page,
        limit: pageSize,
        search,
        status: filter === "All" ? undefined : filter.toLowerCase(),
      });
      if (Array.isArray(resp)) {
        setVehicles(resp);
        setTotalCount(resp.length);
        setTotalPages(Math.max(1, Math.ceil(resp.length / pageSize)));
      } else {
        setVehicles(resp.vehicles || []);
        setTotalPages(resp.pages || Math.max(1, Math.ceil((resp.vehicles?.length || 0) / pageSize)));
        setTotalCount(resp.total !== undefined ? resp.total : (resp.vehicles ? resp.vehicles.length : 0));
        if (resp.globalStats) setGlobalStats(resp.globalStats);
      }
    } catch (err: any) {
      console.warn("Failed to load vehicles:", err.message);
      setVehicles([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoadingData(false);
    }
  };

  // When search or filter changes, always reset to page 1 and reload with fresh params
  React.useEffect(() => {
    setCurrentPage(1);
    reloadVehicles(1, searchTerm, statusFilter);
  }, [searchTerm, statusFilter]);

  // When paginating (page changes but filter/search haven't changed), reload current page
  React.useEffect(() => {
    reloadVehicles(currentPage, searchTerm, statusFilter);
  }, [currentPage]);

  // Load drivers once for assignment dropdown
  React.useEffect(() => {
    (async () => {
      try {
        const res: any = await driversApi.getAll();
        const list: Driver[] = res.drivers || res || [];
        setDrivers(list);
      } catch {
        setDrivers([]);
      }
    })();
  }, []);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Vehicles Management</h1>
          <p className="text-gray-500 font-medium">Manage your fleet inventory, tracking status and assignments.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const csv = ["Registration,Make,Model,Year,Type,Fuel,Mileage,Status,Driver,LastService"]
                .concat(vehicles.map((v) => `${v.registration},${v.make},${v.model},${v.year},${v.type},${v.fuel},${v.mileage},${v.status},${v.driver},${v.lastService}`))
                .join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "vehicles.csv";
              a.click();
              URL.revokeObjectURL(url);
              toast.success("CSV exported");
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <Download size={18} />
            Export CSV
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
          >
            <Plus size={18} />
            Add Vehicle
          </button>
        </div>
      </div>      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Fleet", value: globalStats.total, icon: Truck, color: "text-blue-600", bg: "bg-blue-50/80", border: "border-blue-100/80" },
          { label: "Active", value: globalStats.active, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50/80", border: "border-emerald-100/80" },
          { label: "Inactive", value: globalStats.inactive, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50/80", border: "border-rose-100/80" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ delay: i * 0.07 }}
            className={`group bg-white/70 backdrop-blur-xl p-5 rounded-2xl border ${stat.border} flex items-center gap-4 shadow-sm hover:shadow-md hover:bg-white/90 transition-all`}
          >
            <div className={`w-11 h-11 rounded-xl ${stat.bg} border ${stat.border} ${stat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.12em]">{stat.label}</p>
              <p className="text-2xl font-extrabold text-gray-900 tabular-nums">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>
      {/* Filters & Table */}
      <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 bg-gray-50/80 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-gray-200/80 w-full md:w-80">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search registration, make..."
              className="bg-transparent border-none focus:ring-0 text-sm outline-none w-full font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {["All", "Active", "Inactive"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                  statusFilter === f ? "bg-blue-50 text-blue-600 border-blue-200" : "text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-200"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/60">
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Vehicle Details</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Assigned Driver</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Mileage</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Last Service</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/80">
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400 font-medium">
                    No vehicles found matching your criteria.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <motion.tr key={v.id} layout className="hover:bg-blue-50/20 transition-all group cursor-default">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100/80 border border-gray-200/80 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 group-hover:border-blue-100 transition-colors">
                          {v.type === "Van" || v.type === "Car" ? <Car size={24} /> : <Truck size={24} />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-none mb-1">{v.registration}</p>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-tight">{v.make} {v.model} • {v.year}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold border",
                        v.status === "Active" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                        v.status === "Maintenance" && "bg-amber-50 text-amber-700 border-amber-200",
                        v.status === "Inactive" && "bg-red-50 text-red-700 border-red-200",
                      )}>{v.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                          {v.driver !== "Unassigned" ? v.driver.split(" ").map((n) => n[0]).join("") : "-"}
                        </div>
                        <span className="text-sm font-semibold text-gray-700">{v.driver}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900">{v.mileage.toLocaleString()} mi</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{v.fuel}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-600">{v.lastService}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewingVehicle(v)} className="p-2 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-100 text-gray-400 hover:text-blue-600 transition-all"><Eye size={18} /></button>
                        <button onClick={() => openEditModal(v)} className="p-2 rounded-lg hover:bg-gray-100 border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-700 transition-all"><Edit2 size={18} /></button>
                        <button onClick={() => handleDelete(v.id)} className="p-2 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 text-gray-400 hover:text-red-600 transition-all"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-5 border-t border-gray-100 flex justify-between items-center bg-gray-50/40">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">
            Showing {vehicles.length} of {totalCount} vehicles
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-xl border border-gray-200/80 text-sm font-bold text-gray-600 hover:bg-white hover:border-gray-300 transition-all disabled:text-gray-300 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm font-bold text-gray-400 px-2">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-xl border border-gray-200/80 text-sm font-bold text-gray-600 hover:bg-white hover:border-gray-300 transition-all disabled:text-gray-300 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* View Vehicle Detail Modal */}
      <AnimatePresence>
        {viewingVehicle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setViewingVehicle(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    {viewingVehicle.type === "Van" || viewingVehicle.type === "Car" ? <Car size={28} /> : <Truck size={28} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{viewingVehicle.registration}</h2>
                    <p className="text-sm text-gray-500 font-medium">{viewingVehicle.make} {viewingVehicle.model} • {viewingVehicle.year}</p>
                  </div>
                </div>
                <button onClick={() => setViewingVehicle(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {([
                  ["Status", viewingVehicle.status],
                  ["Type", viewingVehicle.type],
                  ["Fuel", viewingVehicle.fuel],
                  ["Mileage", `${viewingVehicle.mileage.toLocaleString()} mi`],
                  ["Driver", viewingVehicle.driver],
                  ["Last Service", viewingVehicle.lastService],
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-sm font-bold text-gray-900">{val}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => { setViewingVehicle(null); openEditModal(viewingVehicle); }} className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all">Edit Vehicle</button>
                <button onClick={() => setViewingVehicle(null)} className="flex-1 py-3 rounded-2xl border border-gray-200 font-bold hover:bg-gray-50 transition-all">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Vehicle Modal */}
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
                  <h2 className="text-2xl font-bold">{editingVehicle ? "Edit Vehicle" : "Register New Vehicle"}</h2>
                  <p className="text-gray-500 font-medium">Enter technical specifications and initial assignments.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-6">
                  <FormInput label="Registration Number" placeholder="e.g. ABC-1234" required value={formData.registration} onChange={(v) => handleFormChange("registration", v)} />
                  <FormInput label="Vehicle Type" type="select" options={["Van", "Light Truck", "Heavy Truck", "Car"]} value={formData.type} onChange={(v) => handleFormChange("type", v)} />
                  <FormInput label="Make" placeholder="e.g. Volvo" value={formData.make} onChange={(v) => handleFormChange("make", v)} />
                  <FormInput label="Model" placeholder="e.g. FH16" value={formData.model} onChange={(v) => handleFormChange("model", v)} />
                  <FormInput label="Fuel Type" type="select" options={["Diesel", "Electric", "Petrol", "CNG"]} value={formData.fuel} onChange={(v) => handleFormChange("fuel", v)} />
                  <FormInput label="Mileage (Initial)" type="number" placeholder="0" value={String(formData.mileage)} onChange={(v) => handleFormChange("mileage", Number(v))} />
                  <FormInput label="Year" type="number" placeholder="2024" value={String(formData.year)} onChange={(v) => handleFormChange("year", Number(v))} />
                  <FormInput label="Status" type="select" options={["Active", "Maintenance", "Inactive"]} value={formData.status} onChange={(v) => handleFormChange("status", v)} />
                  <FormInput
                    label="Assigned Driver"
                    type="select"
                    options={["Unassigned"].concat(drivers.map(d => d.name))}
                    value={formData.driver || "Unassigned"}
                    onChange={(v) => handleFormChange("driver", v)}
                  />
                  <FormInput label="Last Service Date" type="date" value={formData.lastService} onChange={(v) => handleFormChange("lastService", v)} />
                </div>

                <div className="pt-6 border-t border-gray-100 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl border border-gray-200 font-bold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                  >
                    {editingVehicle ? "Save Changes" : "Register Asset"}
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

function FormInput({
  label,
  placeholder,
  type = "text",
  options,
  required,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  options?: string[];
  required?: boolean;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{label}</label>
      {type === "select" ? (
        <select
          className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium appearance-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options!.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium"
        />
      )}
    </div>
  );
}
