import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { routesApi, adminApi, issuesApi, lostFoundApi } from "../api/endpoints";

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("routes");

  return (
    <div className="admin-page">
      <div className="admin-container">
        <h2 className="admin-title">⚙️ Admin Panel</h2>
        <p className="admin-greeting">Welcome, {user.name}</p>

        <div className="admin-tabs">
          {["routes", "buses", "issues", "lostfound"].map((t) => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t === "routes" && "🗺️ Routes"}
              {t === "buses" && "🚌 Buses"}
              {t === "issues" && "🚩 Issues"}
              {t === "lostfound" && "🔍 Lost & Found"}
            </button>
          ))}
        </div>

        <div className="admin-content">
          {tab === "routes" && <RoutesTab />}
          {tab === "buses" && <BusesTab />}
          {tab === "issues" && <IssuesTab />}
          {tab === "lostfound" && <LostFoundTab />}
        </div>
      </div>
    </div>
  );
}

// --- Routes Tab ---
function RoutesTab() {
  const [routes, setRoutes] = useState([]);
  const [form, setForm] = useState({ name: "", start_point: "", end_point: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    loadRoutes();
  }, []);

  async function loadRoutes() {
    try {
      const data = await routesApi.list();
      setRoutes(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await adminApi.createRoute(form);
      setForm({ name: "", start_point: "", end_point: "" });
      loadRoutes();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this route and all its stops?")) return;
    try {
      await adminApi.deleteRoute(id);
      loadRoutes();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      <form className="admin-form" onSubmit={handleCreate}>
        <input placeholder="Route name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="Start point" value={form.start_point} onChange={(e) => setForm({ ...form, start_point: e.target.value })} required />
        <input placeholder="End point" value={form.end_point} onChange={(e) => setForm({ ...form, end_point: e.target.value })} required />
        <button className="btn btn-primary btn-sm" type="submit">Add Route</button>
      </form>
      <div className="admin-list">
        {routes.map((r) => (
          <div key={r.id} className="admin-list-item">
            <div>
              <strong>{r.name}</strong>
              <span className="text-muted"> ({r.start_point} → {r.end_point})</span>
            </div>
            <button className="btn btn-danger btn-xs" onClick={() => handleDelete(r.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Buses Tab ---
function BusesTab() {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [form, setForm] = useState({ bus_number: "", route_id: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [busData, routeData] = await Promise.all([adminApi.listBuses(), routesApi.list()]);
      setBuses(busData);
      setRoutes(routeData);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await adminApi.createBus({ bus_number: form.bus_number, route_id: form.route_id || null });
      setForm({ bus_number: "", route_id: "" });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this bus?")) return;
    try {
      await adminApi.deleteBus(id);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      <form className="admin-form" onSubmit={handleCreate}>
        <input placeholder="Bus number (e.g. BH-05)" value={form.bus_number} onChange={(e) => setForm({ ...form, bus_number: e.target.value })} required />
        <select value={form.route_id} onChange={(e) => setForm({ ...form, route_id: e.target.value })}>
          <option value="">No route</option>
          {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" type="submit">Add Bus</button>
      </form>
      <div className="admin-list">
        {buses.map((b) => (
          <div key={b.id} className="admin-list-item">
            <div>
              <strong>{b.bus_number}</strong>
              <span className="text-muted"> — {b.route_name || "Unassigned"}</span>
              {b.driver_name && <span className="text-muted"> (Driver: {b.driver_name})</span>}
              <span className={`status-badge ${b.status}`}>{b.status}</span>
            </div>
            <button className="btn btn-danger btn-xs" onClick={() => handleDelete(b.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Issues Tab ---
function IssuesTab() {
  const [issues, setIssues] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadIssues();
  }, []);

  async function loadIssues() {
    try {
      setIssues(await issuesApi.list());
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleResolve(busId, category) {
    try {
      await issuesApi.resolve(busId, category);
      loadIssues();
    } catch (err) {
      setError(err.message);
    }
  }

  const severityColors = { high: "severity-high", medium: "severity-medium", low: "severity-low" };

  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      {issues.length === 0 && <p className="text-muted">No active issues 🎉</p>}
      <div className="admin-list">
        {issues.map((issue, i) => (
          <div key={i} className="admin-list-item issue-item">
            <div>
              <span className={`severity-badge ${severityColors[issue.severity]}`}>
                {issue.severity.toUpperCase()}
              </span>
              <strong> {issue.bus_number}</strong> — {issue.category}
              <span className="text-muted"> ({issue.flag_count} reports)</span>
            </div>
            <button className="btn btn-success btn-xs" onClick={() => handleResolve(issue.bus_id, issue.category)}>
              ✓ Resolve
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Lost & Found Tab ---
function LostFoundTab() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      setItems(await lostFoundApi.list());
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStatus(id, status) {
    try {
      await lostFoundApi.updateStatus(id, status);
      loadItems();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      {items.length === 0 && <p className="text-muted">No lost & found items</p>}
      <div className="admin-list">
        {items.map((item) => (
          <div key={item.id} className="admin-list-item">
            <div>
              <span className={`type-badge ${item.type}`}>
                {item.type === "lost" ? "😢 Lost" : "🎉 Found"}
              </span>
              <strong> {item.description}</strong>
              {item.route_name && <span className="text-muted"> — {item.route_name}</span>}
              <span className={`status-badge ${item.status}`}>{item.status}</span>
              <span className="text-muted"> 📞 {item.contact_phone}</span>
            </div>
            <div className="item-actions">
              {item.status === "open" && (
                <button className="btn btn-primary btn-xs" onClick={() => updateStatus(item.id, "matched")}>
                  Match
                </button>
              )}
              {item.status === "matched" && (
                <button className="btn btn-success btn-xs" onClick={() => updateStatus(item.id, "closed")}>
                  Close
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
