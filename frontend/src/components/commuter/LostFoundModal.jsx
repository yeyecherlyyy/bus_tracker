import { useState } from "react";
import { lostFoundApi } from "../../api/endpoints";
import Modal from "../Modal";

export default function LostFoundModal({ onClose, routes }) {
  const [form, setForm] = useState({
    type: "lost",
    route_id: "",
    description: "",
    contact_phone: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await lostFoundApi.create({
        type: form.type,
        route_id: form.route_id ? Number(form.route_id) : null,
        description: form.description,
        contact_phone: form.contact_phone,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Modal title="Lost & Found" onClose={onClose}>
        <div className="success-msg">
          <span className="success-icon">✅</span>
          <p>Your item has been reported. We'll try to match it!</p>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="🔍 Lost & Found" onClose={onClose}>
      <form onSubmit={handleSubmit} className="lostfound-form">
        {error && <div className="form-error">{error}</div>}

        <label>Type</label>
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
          <option value="">Not sure</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        <label>Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Describe the item..."
          rows={3}
          required
        />

        <label>Contact Phone</label>
        <input
          type="tel"
          value={form.contact_phone}
          onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
          placeholder="Your phone number"
          required
        />

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit"}
        </button>
      </form>
    </Modal>
  );
}
