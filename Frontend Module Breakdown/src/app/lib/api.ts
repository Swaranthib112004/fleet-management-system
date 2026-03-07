// ==============================
// FleetPro - API layer
// Frontend helpers for HTTP requests to backend
// ==============================

import type {
    Vehicle,
    Driver,
    MaintenanceLog,
    DocumentFile,
    Route,
    TrackedVehicle,
    Reminder,
    NotificationSetting,
    Role,
    AuditLog,
} from "./types";
import { request } from "./http";

// helper function to normalize MongoDB _id to id
function normalizeId(obj: any): any {
    if (!obj) return obj;
    if (Array.isArray(obj)) return obj.map(normalizeId);
    if (typeof obj === 'object') {
        const normalized: any = { ...obj };
        if (normalized._id && !normalized.id) {
            normalized.id = normalized._id;
        }
        return normalized;
    }
    return obj;
}

// helper open methods that call backend endpoints

// =====================
// VEHICLES
// =====================
export const vehiclesApi = {
    getAll: async (params?: Record<string, any>): Promise<any> => {
        // Filter out undefined and null values to avoid sending "undefined" strings
        const cleanParams = params ? Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
        ) : {};
        const query = Object.keys(cleanParams).length > 0 ? "?" + new URLSearchParams(cleanParams).toString() : "";
        const res: any = await request(`/api/vehicles${query}`);
        // If it's a paginated response, normalize IDs in the vehicles array
        if (res.vehicles) {
            res.vehicles = normalizeId(res.vehicles);
            return res;
        }
        return normalizeId(res);
    },
    getById: async (id: string): Promise<Vehicle> => {
        const res = await request(`/api/vehicles/${id}`);
        return normalizeId(res);
    },
    create: async (data: Omit<Vehicle, "id">): Promise<Vehicle> => {
        const res = await request("/api/vehicles", { method: "POST", body: JSON.stringify(data) });
        return normalizeId(res.vehicle || res);
    },
    update: async (id: string, data: Partial<Vehicle>): Promise<Vehicle> => {
        const res = await request(`/api/vehicles/${id}`, { method: "PUT", body: JSON.stringify(data) });
        return normalizeId(res.vehicle || res);
    },
    delete: async (id: string): Promise<{ success: boolean }> =>
        request(`/api/vehicles/${id}`, { method: "DELETE" }),
};

// =====================
// DRIVERS
// =====================
export const driversApi = {
    getAll: async (params?: Record<string, any>): Promise<any> => {
        // Filter out undefined and null values to avoid sending "undefined" strings
        const cleanParams = params ? Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
        ) : {};
        const query = Object.keys(cleanParams).length > 0 ? "?" + new URLSearchParams(cleanParams).toString() : "";
        const res: any = await request(`/api/drivers${query}`);
        // Normalize _id to id in drivers array
        if (res.drivers) res.drivers = normalizeId(res.drivers);
        return res;
    },
    getById: async (id: string): Promise<Driver> => {
        const res = await request(`/api/drivers/${id}`);
        return normalizeId(res);
    },
    create: async (data: Omit<Driver, "id">): Promise<Driver> => {
        const res = await request(`/api/drivers`, { method: "POST", body: JSON.stringify(data) });
        return normalizeId(res.driver || res);
    },
    update: async (id: string, data: Partial<Driver>): Promise<Driver> => {
        const res = await request(`/api/drivers/${id}`, { method: "PUT", body: JSON.stringify(data) });
        return normalizeId(res.driver || res);
    },
    delete: async (id: string): Promise<{ success: boolean }> =>
        request(`/api/drivers/${id}`, { method: "DELETE" }),
};

// =====================
// MAINTENANCE
// =====================
export const maintenanceApi = {
    getAll: async (params?: Record<string, any>): Promise<any> => {
        // Filter out undefined and null values to avoid sending "undefined" strings
        const cleanParams = params ? Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
        ) : {};
        const query = Object.keys(cleanParams).length > 0 ? "?" + new URLSearchParams(cleanParams).toString() : "";
        const res: any = await request(`/api/maintenance${query}`);
        // Return full response for pagination support, normalize IDs inside items/maintenance
        if (res.items) res.items = normalizeId(res.items);
        if (res.maintenance) res.maintenance = normalizeId(res.maintenance);
        return res;
    },
    create: async (data: Omit<MaintenanceLog, "id">): Promise<MaintenanceLog> => {
        const res = await request(`/api/maintenance`, { method: "POST", body: JSON.stringify(data) });
        return normalizeId(res.maintenance || res);
    },
    update: async (id: string, data: Partial<MaintenanceLog>): Promise<MaintenanceLog> => {
        const res = await request(`/api/maintenance/${id}`, { method: "PUT", body: JSON.stringify(data) });
        return normalizeId(res.maintenance || res);
    },
    delete: async (id: string): Promise<{ success: boolean }> =>
        request(`/api/maintenance/${id}`, { method: "DELETE" }),
};

// =====================
// DOCUMENTS (file management)
// =====================
export const documentsApi = {
    getAll: async (params?: Record<string, any>): Promise<DocumentFile[]> => {
        // Filter out undefined and null values to avoid sending "undefined" strings
        const cleanParams = params ? Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
        ) : {};
        const query = Object.keys(cleanParams).length > 0 ? "?" + new URLSearchParams(cleanParams).toString() : "";
        const res: any = await request(`/api/uploads${query}`);
        // Handle various response shapes from backend: array, { data: [...] }, { documents: [...] }, { files: [...] }
        if (Array.isArray(res)) return res;
        if (res?.data) return res.data;
        return res?.documents || res?.files || [];
    },
    create: async (form: FormData): Promise<DocumentFile> => {
        try {
            const res = await request(`/api/uploads`, { method: "POST", body: form });
            // Backend returns { message: '...', document: {...} }
            return res.document || res;
        } catch (err: any) {
            // eslint-disable-next-line no-console
            console.error('Upload error:', err?.status, err?.body || err?.message);
            throw err;
        }
    },
    delete: async (id: string): Promise<{ success: boolean }> =>
        request(`/api/uploads/${id}`, { method: "DELETE" }),
};

// =====================
// ROUTES / ROUTE OPTIMIZATION
// =====================
export const routesApi = {
    getAll: async (params?: Record<string, any>): Promise<Route[]> => {
        // Filter out undefined and null values to avoid sending "undefined" strings
        const cleanParams = params ? Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
        ) : {};
        const query = Object.keys(cleanParams).length > 0 ? "?" + new URLSearchParams(cleanParams).toString() : "";
        // Return the raw backend response so callers can access pagination/data
        const res: any = await request(`/api/routes${query}`);
        return res;
    },
    create: async (data: Omit<Route, "id">): Promise<Route> => {
        const res = await request(`/api/routes`, { method: "POST", body: JSON.stringify(data) });
        return normalizeId(res.route || res);
    },
    delete: async (id: string): Promise<{ success: boolean }> =>
        request(`/api/routes/${id}`, { method: "DELETE" }),
    optimize: async (data: any) =>
        request(`/api/routes/optimize`, { method: "POST", body: JSON.stringify(data) }),
};

// =====================
// TRACKED VEHICLES (GPS)
// =====================
// the backend provides a fleet‑locations endpoint; unwrap the returned data
export const trackedApi = {
    getAll: async (): Promise<TrackedVehicle[]> => {
        const res: any = await request(`/api/gps/fleet-locations`);
        return res.data || [];
    },
};

// =====================
// REMINDERS
// =====================
export const remindersApi = {
    getAll: async (): Promise<Reminder[]> => {
        const res: any = await request(`/api/reminders`);
        // Handle both direct array and nested reminders response
        const reminders = Array.isArray(res) ? res : (res?.reminders || []);
        return normalizeId(reminders);
    },
    create: async (data: Omit<Reminder, "id">) => {
        const res = await request(`/api/reminders`, { method: "POST", body: JSON.stringify(data) });
        return normalizeId(res.reminder || res);
    },
    // other endpoints as appropriate
};

// =====================
// SETTINGS & NOTIFICATIONS
// =====================
export const notificationsApi = {
    getAll: async (): Promise<NotificationSetting[]> => {
        const res: any = await request(`/api/settings/notifications`);
        const notifications = Array.isArray(res) ? res : (res?.notifications || []);
        return normalizeId(notifications);
    },
    toggle: async (id: string): Promise<NotificationSetting> => {
        const res = await request(`/api/settings/notifications/${id}/toggle`, { method: "POST" });
        return normalizeId(res);
    }
};

export const rolesApi = {
    getAll: async (): Promise<Role[]> => {
        const res: any = await request(`/api/roles`);
        const roles = Array.isArray(res) ? res : (res?.roles || []);
        return normalizeId(roles);
    },
    create: async (data: Omit<Role, "id">) => {
        const res = await request(`/api/roles`, { method: "POST", body: JSON.stringify(data) });
        return normalizeId(res.role || res);
    },
    delete: async (id: string) =>
        request(`/api/roles/${id}`, { method: "DELETE" }),
};

export const auditApi = {
    getAll: async (): Promise<AuditLog[]> => {
        const res: any = await request(`/api/audit`);
        const audit = Array.isArray(res) ? res : (res?.audit || res?.logs || []);
        return normalizeId(audit);
    },
    add: async (data: Omit<AuditLog, "id">) => {
        const res = await request(`/api/audit`, { method: "POST", body: JSON.stringify(data) });
        return normalizeId(res);
    },
};

// =====================
// DASHBOARD METRICS
// =====================
export const dashboardApi = {
    getOverview: async () => request(`/api/dashboard/overview`),
    getChartData: async () => request(`/api/dashboard/chart`),
    getActivities: async () => request(`/api/dashboard/activities`),
    getAnalytics: async () => request(`/api/dashboard/analytics`),
    getPieData: async () => request(`/api/dashboard/pie`),
    // Role-specific dashboards
    getDriverDashboard: async () => request(`/api/dashboard/driver`),
    getCustomerDashboard: async () => request(`/api/dashboard/customer`),
};

// =====================
// AI CHAT ASSISTANT
// =====================
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date;
}

export interface ChatResponse {
    success: boolean;
    message: string;
    recommendations?: any[];
    isQuery?: boolean;
    isRecommendation?: boolean;
    timestamp?: Date;
}

export interface QueryResult {
    success: boolean;
    query: string;
    answer: string;
    dataUsed?: string[];
    timestamp?: Date;
}

export const aiAssistantApi = {
    sendMessage: async (message: string): Promise<ChatResponse> => {
        const res: any = await request(`/api/ai/chat`, {
            method: "POST",
            body: JSON.stringify({ message })
        });
        return res.data || res;
    },

    queryData: async (query: string): Promise<QueryResult> => {
        const res: any = await request(`/api/ai/query`, {
            method: "POST",
            body: JSON.stringify({ query })
        });
        return res.data || res;
    },

    getRecommendations: async () => {
        const res: any = await request(`/api/ai/recommendations`);
        return res.data || res;
    },

    clearHistory: async () => {
        const res: any = await request(`/api/ai/clear-history`, {
            method: "POST"
        });
        return res.data || res;
    },

    getFleetContext: async () => {
        const res: any = await request(`/api/ai/context`);
        return res.data || res;
    }
};
