export default function EtaCard({ busNumber, etas, passengerCount }) {
  if (!etas || etas.length === 0) return null;

  // Show crowding level based on passenger count
  function getCrowdingLabel(count) {
    if (count == null) return null;
    if (count <= 15) return { text: "Empty", color: "#16a34a" };
    if (count <= 35) return { text: "Available", color: "#2563eb" };
    if (count <= 50) return { text: "Crowded", color: "#d97706" };
    return { text: "Full", color: "#dc2626" };
  }

  const crowding = getCrowdingLabel(passengerCount);

  return (
    <div className="eta-card">
      <div className="eta-card-header">
        <span className="eta-bus-badge">🚌 {busNumber}</span>
        {crowding && (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 10,
            background: crowding.color + "18",
            color: crowding.color,
          }}>
            👥 {passengerCount} — {crowding.text}
          </span>
        )}
      </div>
      <div className="eta-list">
        {etas.map((eta, i) => (
          <div key={i} className="eta-item">
            <span className="eta-stop-name">{eta.stop_name}</span>
            <span className="eta-time">
              {eta.eta_minutes} <small>min</small>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
