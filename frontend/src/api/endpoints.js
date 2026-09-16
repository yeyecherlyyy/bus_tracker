import { apiFetch } from "./client";

// --- Auth ---
export const authApi = {
  signup: (data) => apiFetch("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
  login: (data) => apiFetch("/auth/login", { method: "POST", body: JSON.stringify(data) }),
};

// --- Routes (public) ---
export const routesApi = {
  list: () => apiFetch("/routes"),
  get: (id) => apiFetch(`/routes/${id}`),
  live: (id) => apiFetch(`/routes/${id}/live`),
  checkin: (stopId) => apiFetch(`/routes/stops/${stopId}/checkin`, { method: "POST" }),
};

// --- Driver ---
export const driverApi = {
  getAssignment: () => apiFetch("/driver/assignment"),
  startTrip: () => apiFetch("/driver/trip/start", { method: "POST" }),
  endTrip: () => apiFetch("/driver/trip/end", { method: "POST" }),
  sendLocation: (data) =>
    apiFetch("/driver/location", { method: "POST", body: JSON.stringify(data) }),
  updatePassengerCount: (count) =>
    apiFetch("/driver/passenger-count", { method: "PATCH", body: JSON.stringify({ count }) }),
};

// --- Issues ---
export const issuesApi = {
  create: (data) => apiFetch("/issues", { method: "POST", body: JSON.stringify(data) }),
  list: () => apiFetch("/issues"),
  resolve: (busId, category) =>
    apiFetch(`/issues/${busId}/${category}/resolve`, { method: "PATCH" }),
};

// --- Lost & Found ---
export const lostFoundApi = {
  create: (data) => apiFetch("/lostfound", { method: "POST", body: JSON.stringify(data) }),
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/lostfound${qs ? "?" + qs : ""}`);
  },
  updateStatus: (id, status) =>
    apiFetch(`/lostfound/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

// --- Admin ---
export const adminApi = {
  // Routes
  createRoute: (data) => apiFetch("/admin/routes", { method: "POST", body: JSON.stringify(data) }),
  updateRoute: (id, data) =>
    apiFetch(`/admin/routes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteRoute: (id) => apiFetch(`/admin/routes/${id}`, { method: "DELETE" }),

  // Stops
  createStop: (data) => apiFetch("/admin/stops", { method: "POST", body: JSON.stringify(data) }),
  updateStop: (id, data) =>
    apiFetch(`/admin/stops/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteStop: (id) => apiFetch(`/admin/stops/${id}`, { method: "DELETE" }),

  // Buses
  listBuses: () => apiFetch("/admin/buses"),
  createBus: (data) => apiFetch("/admin/buses", { method: "POST", body: JSON.stringify(data) }),
  updateBus: (id, data) =>
    apiFetch(`/admin/buses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteBus: (id) => apiFetch(`/admin/buses/${id}`, { method: "DELETE" }),
};

// --- Chat ---
export const chatApi = {
  send: (message) =>
    apiFetch("/chat", { method: "POST", body: JSON.stringify({ message }) }),
};
