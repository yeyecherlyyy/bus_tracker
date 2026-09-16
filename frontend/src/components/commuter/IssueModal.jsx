import { useState, useEffect } from "react";
import { issuesApi, routesApi } from "../../api/endpoints";
import Modal from "../Modal";

const CATEGORIES = [
  { value: "overcrowding", label: "🚶 Overcrowding" },
  { value: "safety", label: "⚠️ Safety" },
  { value: "cleanliness", label: "🧹 Cleanliness" },
  { value: "delay", label: "⏰ Delay" },
  { value: "driver_behavior", label: "🚗 Driver Behavior" },
  { value: "mechanical", label: "🔧 Mechanical" },
];

export default function IssueModal({ onClose, buses }) {
  const [form, setForm] = useState({ bus_id: "", category: "", description: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await issuesApi.create({
        bus_id: Number(form.bus_id),
        category: form.category,
        description: form.description,
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
      <Modal title="Report Issue" onClose={onClose}>
        <div className="success-msg">
          <span className="success-icon">✅</span>
          <p>Issue reported successfully! Thank you for helping improve the service.</p>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="🚩 Report an Issue" onClose={onClose}>
      <form onSubmit={handleSubmit} className="issue-form">
        {error && <div className="form-error">{error}</div>}

        <label>Bus</label>
        <select
          value={form.bus_id}
          onChange={(e) => setForm({ ...form, bus_id: e.target.value })}
          required
        >
          <option value="">Select a bus</option>
          {buses.map((b) => (
            <option key={b.bus_id} value={b.bus_id}>{b.bus_number}</option>
          ))}
        </select>

        <label>Category</label>
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          required
        >
          <option value="">Select category</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        <label>Description (optional)</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Tell us more..."
          rows={3}
        />

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Report"}
        </button>
      </form>
    </Modal>
  );
}
