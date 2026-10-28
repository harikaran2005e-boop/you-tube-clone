// Centralized API & Backend URL configuration for Local Dev & Render Deployment
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

// Determine the API base URL:
// 1. If VITE_API_URL is explicitly set in environment variables, use it.
// 2. If running locally on a dev port (e.g., 5173), route to local backend on 5000.
// 3. Otherwise (e.g. production single-service deployment), route to the current origin /api.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (isLocalhost && window.location.port !== "5000"
    ? "http://localhost:5000/api"
    : `${typeof window !== "undefined" ? window.location.origin : ""}/api`);

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (isLocalhost && window.location.port !== "5000"
    ? "http://localhost:5000"
    : typeof window !== "undefined" ? window.location.origin : "");
