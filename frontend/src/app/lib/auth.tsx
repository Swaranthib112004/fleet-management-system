import React, { createContext, useContext, useEffect, useState } from "react";
import { request } from "./http";

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  login: (email: string, password: string, role?: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  initializing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Helper: synchronously read the initial token from URL or localStorage
// so the very first render already has the token value, preventing
// ProtectedRoute from flashing a redirect to /login.
function getInitialToken(): string | null {
  try {
    const url = new URL(window.location.href);
    const tokenFromUrl = url.searchParams.get("token");
    if (tokenFromUrl) {
      localStorage.setItem("fp_token", tokenFromUrl);
      // Clean up the URL immediately
      url.searchParams.delete("token");
      window.history.replaceState({}, document.title, url.pathname + url.search);
      return tokenFromUrl;
    }
    return localStorage.getItem("fp_token");
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Eagerly read token so ProtectedRoute sees it on the very first render
  const [token, setToken] = useState<string | null>(getInitialToken);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  // true while we are still verifying the token with the backend
  const [initializing, setInitializing] = useState(true);

  // Verify the token with the backend on mount
  useEffect(() => {
    const t = token;
    if (t) {
      request("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } })
        .then((res) => {
          // /me may return { user: {...} } or the user object directly
          setUser(res.user || res);
        })
        .catch((err) => {
          // Only clear token if it's truly invalid (401), not on other errors
          if (err?.status === 401) {
            setToken(null);
            localStorage.removeItem("fp_token");
          } else {
            // For other errors (network, etc), keep the token but warn silently
            console.warn('Auth verification failed (non-401):', err?.message);
            // Still set a basic user from token payload if available
            setUser({ name: 'User', email: 'unknown', role: 'driver' });
          }
        })
        .finally(() => setInitializing(false));
    } else {
      setInitializing(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email: string, password: string, role?: string) => {
    setLoading(true);
    try {
      const res = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, role: role || 'driver' }),
      });
      setToken(res.token);
      localStorage.setItem("fp_token", res.token);
      setUser(res.user);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      // network failure (server down / CORS) shows "Failed to fetch" message
      if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
        throw new Error('Unable to reach the backend server. Please check your backend URL (VITE_API_BASE) and CORS settings.');
      }
      throw err;
    }
  };

  const register = async (name: string, email: string, password: string, role: string) => {
    setLoading(true);
    try {
      await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      });
      // The user successfully registered. They will be directed to login via the UI wrapper.
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
        throw new Error('Unable to reach the backend server. Please check your backend URL (VITE_API_BASE) and CORS settings.');
      }
      throw err;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("fp_token");
  };

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout, loading, initializing }}>
      {children}
    </AuthContext.Provider>
  );
};
