import React from "react";
import { Plus, Upload, FileText, Download, Trash2, Search, Filter, MoreVertical, File, Image, FileCode, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { documentsApi } from "../lib/api";
import type { DocumentFile } from "../lib/types";

export function DocumentsPage() {
  const [files, setFiles] = React.useState<DocumentFile[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("All");
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [uploadForm, setUploadForm] = React.useState<{ category: DocumentFile["category"] }>({ category: "Other" });
  const [loadingData, setLoadingData] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const categories = ["All", "Insurance", "License", "Report", "Registration", "Compliance", "Other"];

  const filteredFiles = files.filter((f: DocumentFile) => {
    const matchSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === "All" || f.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles: File[] = Array.from(e.dataTransfer.files);
    
    let uploadedCount = 0;
    for (const file of droppedFiles) {
      const form = new FormData();
      form.append("file", file);
      try {
        const result = await documentsApi.create(form);
        uploadedCount++;
        console.log('✅ Uploaded (drag-drop):', file.name, 'Response:', result);
      } catch (err: any) {
        console.error('❌ Upload error:', file.name, err?.status, err?.message);
        toast.error(err.message || `Failed to upload ${file.name}`);
      }
    }
    
    if (uploadedCount > 0) {
      toast.success(`${uploadedCount} file(s) uploaded`);
    }
    
    await reloadFiles();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles: File[] = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    
    let uploadedCount = 0;
    for (const file of selectedFiles) {
      const form = new FormData();
      form.append("file", file);
      form.append("category", uploadForm.category);
      try {
        const result = await documentsApi.create(form);
        uploadedCount++;
        console.log('✅ Uploaded:', file.name, 'Response:', result);
      } catch (err: any) {
        console.error('❌ Upload error:', file.name, err?.status, err?.message);
        toast.error(err.message || `Failed to upload ${file.name}`);
      }
    }
    
    if (uploadedCount > 0) {
      toast.success(`${uploadedCount} file(s) uploaded`);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
    await reloadFiles();
    setIsUploadModalOpen(false);
  };

  const handleDownload = async (file: any) => {
    if (!file || !file.url || file.url === 'manual_entry') {
      toast.error('This is a manual record with no physical file attached');
      return;
    }

    try {
      const baseUrl = (import.meta as any).env.VITE_API_BASE || 'http://localhost:8000';
      let token: string | null = null;
      try { token = localStorage.getItem('fp_token'); } catch { token = null; }

      const res = await fetch(`${baseUrl}${file.url}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText || 'Download failed');
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = file.name || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      toast.success(`Downloading ${file.name}...`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to download file');
    }
  };


  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await documentsApi.delete(id);
      toast.error("Document deleted");
      await reloadFiles();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "PDF": case "DOCX": return <FileText size={28} />;
      case "JPG": case "PNG": case "JPEG": return <Image size={28} />;
      case "XLSX": case "CSV": return <FileCode size={28} />;
      default: return <File size={28} />;
    }
  };

  const reloadFiles = async () => {
    setLoadingData(true);
    try {
      const list = await documentsApi.getAll();
      const mapped = list.map((doc: any) => {
        try {
          const dateStr = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
          return {
            id: doc.id || doc._id,
            name: doc.filename || doc.name || 'Unknown',
            type: doc.mimetype?.includes('pdf') ? 'PDF' : doc.mimetype?.includes('image') ? 'JPG' : (doc.mimetype?.includes('word') || doc.mimetype?.includes('csv') ? 'DOCX' : doc.type || 'File'),
            size: typeof doc.size === 'number' ? formatFileSize(doc.size) : (doc.size || 'Unknown'),
            category: doc.category || doc.relatedTo?.kind || 'Other',
            date: dateStr,
            url: doc.url
          };
        } catch (mapErr) {
          console.warn('Error mapping document:', doc, mapErr);
          return null;
        }
      }).filter((f: any) => f !== null);
      setFiles(mapped);
    } catch (err: any) {
      console.error("Failed to load documents:", err?.message || err);
      setFiles([]);
    } finally {
      setLoadingData(false);
    }
  };

  React.useEffect(() => {
    reloadFiles();
  }, []);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Documents Management</h1>
          <p className="text-gray-500 font-medium">Secure storage for all your fleet compliance and registration files.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
          >
            <Plus size={18} />
            Add Record
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "h-48 border-2 border-dashed rounded-[3rem] flex flex-col items-center justify-center transition-all gap-4 cursor-pointer",
          isDragging ? "bg-blue-50 border-blue-400 text-blue-600 scale-[1.01]" : "bg-white border-gray-200 text-gray-400 hover:border-blue-300 hover:bg-blue-50/30"
        )}
      >
        <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
          <Upload size={28} />
        </div>
        <div className="text-center">
          <p className="font-bold text-lg text-gray-900 leading-none mb-2">Drag and drop files here</p>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest leading-none">or click to browse from computer</p>
        </div>
      </div>

      {/* Filter & File Grid */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 w-full md:w-80">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              className="bg-transparent border-none focus:ring-0 text-sm outline-none w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && <button onClick={() => setSearchTerm("")}><X size={14} className="text-gray-400" /></button>}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {categories.map((cat: string) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                  categoryFilter === cat ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 p-8 bg-gray-50/20">
          {filteredFiles.length === 0 ? (
            <div className="col-span-full py-16 text-center text-gray-400 font-medium">
              No documents found.
            </div>
          ) : (
            filteredFiles.map((f: DocumentFile) => (
              <motion.div
                key={f.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm group hover:shadow-md hover:border-blue-100 transition-all relative"
              >
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded">{f.category}</span>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                  {getIcon(f.type)}
                </div>
                <div className="mb-6">
                  <h3 className="font-bold text-gray-900 text-sm truncate mb-1" title={f.name}>{f.name}</h3>
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <span>{f.size}</span>
                    <span>{f.date}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(f)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all text-gray-600 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Download size={14} /> Save
                  </button>
                  <button
                    onClick={() => handleDelete(f.id, f.name)}
                    className="p-2.5 rounded-xl border border-red-50 hover:bg-red-50 transition-all text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-50 bg-gray-50/20 text-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{filteredFiles.length} document(s)</p>
        </div>
      </div>

      {/* Add Record / Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsUploadModalOpen(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Upload Document</h2>
                  <p className="text-gray-500 font-medium">Select a category and upload a physical file.</p>
                </div>
                <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Document Category</label>
                  <select value={uploadForm.category} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUploadForm({ category: e.target.value as DocumentFile["category"] })} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium appearance-none">
                    {["Insurance", "License", "Report", "Registration", "Compliance", "Other"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="h-40 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-gray-50 text-gray-400 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                >
                  <Upload size={32} className="mb-3" />
                  <p className="font-bold text-gray-700 mb-1">Click to browse your files</p>
                  <p className="text-xs font-medium uppercase tracking-wider">Supports PDF, JPG, PNG, DOCX</p>
                </div>
                <button type="button" onClick={() => setIsUploadModalOpen(false)} className="w-full py-4 rounded-2xl border border-gray-200 font-bold hover:bg-gray-50 transition-all">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
