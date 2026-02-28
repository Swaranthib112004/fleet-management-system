import React from "react";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "./lib/ProtectedRoute";
import { Dashboard } from "./pages/dashboard";
import { LandingPage } from "./pages/landing-page";
import { LoginPage } from "./pages/login-page";
import { Shell } from "./components/shell";
import { VehiclesPage } from "./pages/vehicles-page";
import { DriversPage } from "./pages/drivers-page";
import { MaintenancePage } from "./pages/maintenance-page";
import { RoutingPage } from "./pages/routing-page";
import { AnalyticsPage } from "./pages/analytics-page";
import { DocumentsPage } from "./pages/documents-page";
import { SettingsPage } from "./pages/settings-page";

// small fallback component used when no route matches
function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-3xl font-bold">404 - Page not found</h1>
    </div>
  );
}

// ProtectedRoute is passed via context from App
export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
    errorElement: <NotFound />
  },
  {
    path: "/login",
    element: <LoginPage />,
    errorElement: <NotFound />
  },
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <Shell />
      </ProtectedRoute>
    ),
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <Dashboard />,
        errorElement: <NotFound />
      },
      {
        path: "fleet/vehicles",
        element: <VehiclesPage />,
        errorElement: <NotFound />
      },
      {
        path: "fleet/drivers",
        element: <DriversPage />,
        errorElement: <NotFound />
      },
      {
        path: "maintenance",
        element: <MaintenancePage />,
        errorElement: <NotFound />
      },
      {
        path: "routing",
        element: <RoutingPage />,
        errorElement: <NotFound />
      },
      {
        path: "analytics",
        element: <AnalyticsPage />,
        errorElement: <NotFound />
      },
      {
        path: "documents",
        element: <DocumentsPage />,
        errorElement: <NotFound />
      },
      {
        path: "settings",
        element: <SettingsPage />,
        errorElement: <NotFound />
      },
    ],
  },
  // catch-all route prevents blank white screen when wrong path entered
  {
    path: "*",
    element: <NotFound />,
  },
]);
