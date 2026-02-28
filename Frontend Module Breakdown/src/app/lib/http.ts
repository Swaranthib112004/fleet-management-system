// simple fetch wrapper with error handling and environment base URL

const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

export async function request(path: string, options: RequestOptions = {}) {
  const url = BASE + path;
  const opts: RequestOptions = {
    headers: {
      ...(options.headers || {}),
    },
    credentials: "include", // if using cookies
    ...options,
  };

  // Set Content-Type only for non-FormData requests
  // FormData needs no explicit Content-Type so browser sets multipart/form-data with boundary
  if (!(options.body instanceof FormData)) {
    opts.headers = opts.headers || {};
    if (!opts.headers["Content-Type"]) {
      opts.headers["Content-Type"] = "application/json";
    }
  }

  // attach JWT from localStorage if available
  try {
    const stored = localStorage.getItem("fp_token");
    if (stored) {
      opts.headers = opts.headers || {};
      opts.headers.Authorization = `Bearer ${stored}`;
    }
  } catch (e) {
    // localStorage may not be available in some environments, ignore
  }

  const res = await fetch(url, opts);

  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    // not json
    data = text;
  }
  
  if (!res.ok) {
    const err: any = new Error(data?.message || res.statusText || "Request failed");
    err.status = res.status;
    err.body = data;
    
    // Only clear token on truly unauthorized responses, not on server errors
    if (res.status === 401 && !url.includes('/me')) {
      try { localStorage.removeItem("fp_token"); } catch { };
    }
    throw err;
  }
  return data;
}
