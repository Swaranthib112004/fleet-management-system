// ==============================
// FleetPro - Core Data Types
// Ready for backend/MongoDB integration
// ==============================

export interface Vehicle {
    id: string;
    registration: string;
    make: string;
    model: string;
    year: number;
    type: "Van" | "Light Truck" | "Heavy Truck" | "Car";
    fuel: "Diesel" | "Electric" | "Petrol" | "CNG";
    mileage: number;
    status: "Active" | "Maintenance" | "Inactive";
    driver: string;
    lastService: string;
}

export interface Driver {
    id: string;
    name: string;
    licenseNumber: string;
    licenseExpiry: string;
    contact: {
        phone: string;
        email: string;
    };
    assignedVehicle: string;
    rating?: number;
}

export interface MaintenanceLog {
    id: string;
    vehicle: string;
    type: string;
    date: string;
    cost: number;
    mechanic: string;
    status: "Completed" | "In Progress" | "Scheduled";
    notes: string;
}

export interface Reminder {
    id: string;
    title: string;
    message?: string;
    date: string;
    vehicle: string;
    critical: boolean;
    description?: string;
    dueDate?: string;
}

export interface DocumentFile {
    id: string;
    name: string;
    type: string;
    size: string;
    date: string;
    category: "Insurance" | "License" | "Report" | "Registration" | "Compliance" | "Other";
}

export interface Route {
    id?: string;
    _id?: string;
    routeCode: string;
    vehicle: string | Vehicle | any;
    driver: string | Driver | any;
    startLocation: {
        name: string;
        latitude: number;
        longitude: number;
    };
    endLocation: {
        name: string;
        latitude: number;
        longitude: number;
    };
    waypoints: Array<{
        address: string;
        latitude: number;
        longitude: number;
        stopType: "pickup" | "delivery" | "inspection";
        estimatedTime?: string;
        actualTime?: string;
        status?: string;
        notes?: string;
    }>;
    status: "planned" | "active" | "paused" | "completed";
    startTime: string;
    estimatedEndTime?: string;
    actualEndTime?: string;
    totalDistance: number;
    totalDuration: number;
    totalStops: number;
    routeType: "standard" | "express" | "optimized";
    optimizationScore?: number;
    isOptimized?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface TrackedVehicle {
    id: string;
    registration: string;
    status: "moving" | "idle" | "offline";
    speed: string | number;
    driver: string;
    x: number;
    y: number;
}

export interface AuditLog {
    id: string;
    user: {
        name?: string;
        email?: string;
        role?: string;
    } | string;
    action: string;
    target?: string;
    createdAt: string;
}

export interface NotificationSetting {
    id: string;
    label: string;
    desc: string;
    enabled: boolean;
}

export interface Role {
    id: string;
    name: string;
    count: number;
    perms: string;
}

export interface UserProfile {
    name: string;
    email: string;
    role: string;
}
