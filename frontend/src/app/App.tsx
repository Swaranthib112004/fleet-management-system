import React from "react";
import { RouterProvider, Navigate } from "react-router-dom";
import { router } from "./routes.tsx";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./lib/auth";
import { ErrorBoundary } from "./components/ErrorBoundary";

// wrapper for routes that require authentication
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { token, initializing } = useAuth();
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  // on mount ping backend to warn if it's not running or unreachable
  React.useEffect(() => {
    fetch('/api')
      .then((r) => {
        if (!r.ok) throw new Error('Bad response');
      })
      .catch(() => {
        // show only once
        import('sonner').then(({ toast }) => {
          toast.error('Cannot reach backend server. Make sure backend is running on port 8000.');
        });
      });
  }, []);

  return (
    <React.StrictMode>
      <AuthProvider>
        <ErrorBoundary>
          <RouterProvider router={router} />
        </ErrorBoundary>
      </AuthProvider>
      <Toaster position="top-right" closeButton richColors />
    </React.StrictMode>
  );
}
