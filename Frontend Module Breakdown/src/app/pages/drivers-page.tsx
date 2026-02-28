import React from "react";
import { Plus, Search, Phone, Mail, Edit2, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { driversApi } from "../lib/api";
import type { Driver } from "../lib/types";

type DriverFormData = Omit<Driver, "id">;

const EMPTY_FORM: DriverFormData = {
  name: "",
  licenseNumber: "",
  licenseExpiry: new Date().toISOString().slice(0, 10),
  contact: {
    phone: "",
    email: "",
  },
  assignedVehicle: "Unassigned",
};

export function DriversPage() {
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingDriver, setEditingDriver] = React.useState<Driver | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [formData, setFormData] = React.useState<DriverFormData>(EMPTY_FORM);
  const [loadingData, setLoadingData] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const pageSize = 6;

  const openAddModal = () => {
    setEditingDriver(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({ ...driver });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDriver) {
        await driversApi.update(editingDriver.id, formData);
        toast.success(`Driver ${formData.name} updated`);
      } else {
        await driversApi.create(formData);
        toast.success(`Driver ${formData.name} registered`);
      }
      await reloadDrivers();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    } finally {
      setIsModalOpen(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      await driversApi.delete(id);
      toast.error(`${name} removed`);
      await reloadDrivers();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  const handleFormChange = (field: keyof DriverFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const reloadDrivers = async () => {
    setLoadingData(true);
    try {
      const resp: any = await driversApi.getAll({
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
      });
      setDrivers(resp.drivers || []);
      if (resp.pages) setTotalPages(resp.pages);
      if (resp.total !== undefined) setTotalCount(resp.total);
    } catch (err: any) {
      // Silently fall back to empty list
      console.warn("Failed to load drivers:", err.message);
      setDrivers([]);
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
    reloadDrivers();
  }, [currentPage, searchTerm]);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Drivers Directory</h1>
          <p className="text-gray-500 font-medium">Manage personnel, track license compliance, and assign vehicles.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 w-64">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search drivers..."
              className="bg-transparent border-none focus:ring-0 text-sm outline-none w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && <button onClick={() => setSearchTerm("")} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>}
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
          >
            <Plus size={18} />
            Register Driver
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map((driver) => (
          <motion.div
            key={driver.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
          >
            {/* License Status Badge */}
            <div className="absolute top-6 right-6">
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                new Date(driver.licenseExpiry) < new Date() ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
              )}>
                {new Date(driver.licenseExpiry) < new Date() ? "Expired" : "Valid"}
              </span>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                {driver.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-none mb-1">{driver.name}</h3>
                <p className="text-xs text-gray-500 font-medium">{driver.licenseNumber}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6 border-y border-gray-50 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium">License</span>
                <span className="font-bold text-gray-900">{driver.licenseNumber}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium">Expiry</span>
                <span className={cn("font-bold", new Date(driver.licenseExpiry) < new Date() ? "text-red-500" : "text-gray-900")}>
                  {driver.licenseExpiry}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium">Vehicle</span>
                <span className="font-bold text-blue-600">{driver.assignedVehicle}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium">Phone</span>
                <span className="font-bold text-gray-900">{driver.contact.phone}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <a href={`tel:${driver.contact.phone}`} className="p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all text-gray-600">
                  <Phone size={16} />
                </a>
                <a href={`mailto:${driver.contact.email}`} className="p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all text-gray-600">
                  <Mail size={16} />
                </a>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEditModal(driver)} className="p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all text-gray-600">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(driver.id, driver.name)} className="p-2.5 rounded-xl border border-red-50 hover:bg-red-50 transition-all text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Add New Skeleton */}
        <button
          onClick={openAddModal}
          className="h-full min-h-[300px] border-2 border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/20 transition-all"
        >
          <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center">
            <Plus size={24} />
          </div>
          <span className="font-bold">Add New Driver</span>
        </button>
      </div>

      {/* Pagination */}
      <div className="p-6 border-t border-gray-50 flex justify-between items-center bg-gray-50/20">
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
          Showing {drivers.length} of {totalCount} drivers
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-white transition-all disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm font-bold text-gray-500 px-2">{currentPage} / {totalPages}</span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-white transition-all disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {/* Add/Edit Driver Modal */}
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
                  <h2 className="text-2xl font-bold">{editingDriver ? "Edit Driver" : "Register New Driver"}</h2>
                  <p className="text-gray-500 font-medium">Enter driver details, license info, and assignment.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
                    <input type="text" required placeholder="e.g. Alex Thompson" value={formData.name} onChange={(e) => handleFormChange("name", e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email</label>
                    <input type="email" required placeholder="e.g. alex@fleetpro.io" value={formData.contact.email} onChange={(e) => handleFormChange("contact", { ...formData.contact, email: e.target.value })} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">License Number</label>
                    <input type="text" required placeholder="e.g. L-12345-X" value={formData.licenseNumber} onChange={(e) => handleFormChange("licenseNumber", e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">License Expiry</label>
                    <input type="date" required value={formData.licenseExpiry} onChange={(e) => handleFormChange("licenseExpiry", e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Phone</label>
                    <input type="tel" required placeholder="+1 555-0123" value={formData.contact.phone} onChange={(e) => handleFormChange("contact", { ...formData.contact, phone: e.target.value })} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Assigned Vehicle</label>
                    <input type="text" placeholder="e.g. VOL-2024-X" value={formData.assignedVehicle} onChange={(e) => handleFormChange("assignedVehicle", e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium" />
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-2xl border border-gray-200 font-bold hover:bg-gray-50 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">
                    {editingDriver ? "Save Changes" : "Register Driver"}
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
