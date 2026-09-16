import { useState, useEffect } from "react";
import { routesApi } from "../api/endpoints";
import { useSocket } from "../hooks/useSocket";
import BusMap from "../components/commuter/BusMap";
import EtaCard from "../components/commuter/EtaCard";
import ChatWidget from "../components/commuter/ChatWidget";
import IssueModal from "../components/commuter/IssueModal";
import LostFoundModal from "../components/commuter/LostFoundModal";

export default function CommuterPage() {
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [stops, setStops] = useState([]);
  const [buses, setBuses] = useState([]);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showLostFound, setShowLostFound] = useState(false);
  const [error, setError] = useState("");

  const socketRef = useSocket(selectedRouteId);

  // Load all routes on mount
  useEffect(() => {
    routesApi.list()
      .then(setRoutes)
      .catch((err) => setError("Failed to load routes: " + err.message));
  }, []);

  // When route changes, fetch live data
  useEffect(() => {
    if (!selectedRouteId) return;

    routesApi.live(selectedRouteId)
      .then((data) => {
        setStops(data.stops);
        setBuses(data.buses);
      })
      .catch((err) => setError("Failed to load live data: " + err.message));
  }, [selectedRouteId]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socketRef.current) return;
    const socket = socketRef.current;

    function handleLocationUpdate(data) {
      setBuses((prev) => {
        const idx = prev.findIndex((b) => b.bus_id === data.bus_id);
        if (idx === -1) {
          return [...prev, data];
        }
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...data };
        return updated;
      });
    }

    function handleBusActive(data) {
      // Refresh live data when a new bus comes online
      routesApi.live(selectedRouteId).then((d) => {
        setStops(d.stops);
        setBuses(d.buses);
      });
    }

    function handleBusInactive(data) {
      setBuses((prev) => prev.filter((b) => b.bus_id !== data.bus_id));
    }

    socket.on("location_update", handleLocationUpdate);
    socket.on("bus_active", handleBusActive);
    socket.on("bus_inactive", handleBusInactive);

    // Passenger count update from conductor
    function handlePassengerUpdate(data) {
      setBuses((prev) =>
        prev.map((b) =>
          b.bus_id === data.bus_id
            ? { ...b, passenger_count: data.passenger_count }
            : b
        )
      );
    }
    socket.on("passenger_update", handlePassengerUpdate);

    return () => {
      socket.off("location_update", handleLocationUpdate);
      socket.off("bus_active", handleBusActive);
      socket.off("bus_inactive", handleBusInactive);
      socket.off("passenger_update", handlePassengerUpdate);
    };
  }, [socketRef.current, selectedRouteId]);

  return (
    <div className="commuter-page">
      {/* Floating side panel */}
      <div className="side-panel">
        <div className="panel-card">
          <h2 className="panel-title">🗺️ Live Bus Tracker</h2>
          <p className="panel-subtitle">Bhopal City Transit</p>

          <select
            className="route-select"
            value={selectedRouteId || ""}
            onChange={(e) => setSelectedRouteId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Select a route</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {error && <div className="form-error">{error}</div>}
        </div>

        {/* ETA cards */}
        {buses.length > 0 && (
          <div className="panel-card">
            <h3 className="panel-section-title">⏱️ Live ETAs</h3>
            {buses.map((bus) => (
              <EtaCard
                key={bus.bus_id}
                busNumber={bus.bus_number}
                etas={bus.etas}
                passengerCount={bus.passenger_count}
              />
            ))}
          </div>
        )}

        {selectedRouteId && buses.length === 0 && (
          <div className="panel-card">
            <p className="no-buses-msg">No active buses on this route right now.</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="panel-card panel-actions">
          <button className="btn btn-warning btn-sm" onClick={() => setShowIssueModal(true)}>
            🚩 Report Issue
          </button>
          <button className="btn btn-info btn-sm" onClick={() => setShowLostFound(true)}>
            🔍 Lost & Found
          </button>
        </div>
      </div>

      {/* Full-screen map */}
      <BusMap stops={stops} buses={buses} />

      {/* Chat FAB */}
      <ChatWidget />

      {/* Modals */}
      {showIssueModal && (
        <IssueModal onClose={() => setShowIssueModal(false)} buses={buses} />
      )}
      {showLostFound && (
        <LostFoundModal onClose={() => setShowLostFound(false)} routes={routes} />
      )}
    </div>
  );
}
