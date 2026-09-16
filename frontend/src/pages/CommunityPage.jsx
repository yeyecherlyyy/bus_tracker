import { useState, useEffect } from "react";
import { lostFoundApi, routesApi } from "../api/endpoints";

export default function CommunityPage() {
  const [items, setItems] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [filter, setFilter] = useState("all"); // all, lost, found
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    type: "lost",
    route_id: "",
    description: "",
    contact_phone: "",
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    loadItems();
    routesApi.list().then(setRoutes).catch(() => {});
  }, []);

  async function loadItems() {
    try {
      const params = {};
      if (filter !== "all") params.type = filter;
      setItems(await lostFoundApi.list(params));
    } catch (err) {
      setError(err.message);
    }
  }

  // Reload when filter changes
  useEffect(() => {
    loadItems();
  }, [filter]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitLoading(true);
    setError("");

    try {
      await lostFoundApi.create({
        type: form.type,
        route_id: form.route_id ? Number(form.route_id) : null,
        description: form.description,
        contact_phone: form.contact_phone,
      });
      setSubmitSuccess(true);
      setForm({ type: "lost", route_id: "", description: "", contact_phone: "" });
      loadItems();

      // Auto-hide success after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowForm(false);
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="community-page">
      <div className="community-container">
        <div className="community-header">
          <div>
            <h2>🔍 Lost & Found — Community Board</h2>
            <p className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>
              Help fellow commuters recover their belongings
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "✕ Cancel" : "+ Report Item"}
          </button>
        </div>

        {/* Submit form */}
        {showForm && (
          <div className="community-card" style={{ marginBottom: 16 }}>
            {submitSuccess ? (
              <div className="success-msg">
                <span className="success-icon">✅</span>
                <p>Item reported! It will appear on the board shortly.</p>
              </div>
            ) : (
              <form className="community-form" onSubmit={handleSubmit}>
                {error && <div className="form-error">{error}</div>}

                <label>What happened?</label>
                <div className="radio-group">
                  <label className={`radio-option ${form.type === "lost" ? "active" : ""}`}>
                    <input
                      type="radio"
                      name="type"
                      value="lost"
                      checked={form.type === "lost"}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                    />
                    😢 I lost something
                  </label>
                  <label className={`radio-option ${form.type === "found" ? "active" : ""}`}>
                    <input
                      type="radio"
                      name="type"
                      value="found"
                      checked={form.type === "found"}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                    />
                    🎉 I found something
                  </label>
                </div>

                <label>Route (optional)</label>
                <select
                  value={form.route_id}
                  onChange={(e) => setForm({ ...form, route_id: e.target.value })}
                >
                  <option value="">Not sure / don't remember</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>

                <label>Describe the item</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Black backpack with a laptop inside, left on the seat near the back door"
                  rows={3}
                  required
                />

                <label>Your phone number</label>
                <input
                  type="tel"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  placeholder="9876543210"
                  required
                />

                <button className="btn btn-primary" type="submit" disabled={submitLoading}>
                  {submitLoading ? "Submitting..." : "Submit Report"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="community-filters">
          <button
            className={`filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            📋 All Items
          </button>
          <button
            className={`filter-btn ${filter === "lost" ? "active" : ""}`}
            onClick={() => setFilter("lost")}
          >
            😢 Lost Items
          </button>
          <button
            className={`filter-btn ${filter === "found" ? "active" : ""}`}
            onClick={() => setFilter("found")}
          >
            🎉 Found Items
          </button>
        </div>

        {/* Items grid */}
        {items.length === 0 ? (
          <div className="community-empty">
            <span className="community-empty-icon">📭</span>
            <p>No items reported yet. Be the first to help!</p>
          </div>
        ) : (
          <div className="community-grid">
            {items.map((item) => (
              <div key={item.id} className="community-card">
                <div className="community-card-header">
                  <span className={`community-card-type ${item.type}`}>
                    {item.type === "lost" ? "😢 LOST" : "🎉 FOUND"}
                  </span>
                  <span className="community-card-date">
                    {formatDate(item.occurred_at)}
                  </span>
                </div>

                <p className="community-card-desc">{item.description}</p>

                <div className="community-card-meta">
                  {item.route_name && <span>🗺️ {item.route_name}</span>}
                  {item.bus_number && <span>🚌 {item.bus_number}</span>}
                  <span>📞 {item.contact_phone}</span>
                </div>

                <div className="community-card-status">
                  <span className={`status-badge ${item.status}`}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
