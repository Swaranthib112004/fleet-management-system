import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./auth";

// Define which routes each role can access
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/app": ["admin", "manager", "driver", "customer"],
  "/app/fleet/vehicles": ["admin", "manager"],
  "/app/fleet/drivers": ["admin", "manager"],
  "/app/maintenance": ["admin", "manager"],
  "/app/routing": ["admin", "manager", "driver", "customer"],
  "/app/analytics": ["admin", "manager"],
  "/app/documents": ["admin", "manager", "customer"],
  "/app/settings": ["admin"],
};

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, user, initializing } = useAuth();
  const location = useLocation();

  // While auth is still initializing (checking token from URL/localStorage),
  // show a loading indicator instead of redirecting to /login.
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Check route-level permissions if user data is available
  if (user?.role) {
    const path = location.pathname;
    // Sort routes by length so we match more specific paths over general ones (like /app overriding /app/fleet)
    const sortedRoutes = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);
    const matchedRoute = sortedRoutes.find(route => path.startsWith(route));

    if (matchedRoute) {
      const allowedRoles = ROUTE_PERMISSIONS[matchedRoute];
      if (!allowedRoles.includes(user.role)) {
        // Redirect unauthorized users back to dashboard
        return <Navigate to="/app" replace />;
      }
    }
  }

  return <>{children}</>;
}
