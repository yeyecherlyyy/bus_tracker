const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_BASE = `${BACKEND_URL}/api`;

// Thin fetch wrapper — attaches JWT if present, throws on non-2xx
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}
