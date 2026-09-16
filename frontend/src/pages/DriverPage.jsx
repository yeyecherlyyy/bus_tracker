import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { driverApi, routesApi } from "../api/endpoints";
import BusMap from "../components/commuter/BusMap";

export default function DriverPage() {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [tripActive, setTripActive] = useState(false);
  const [location, setLocation] = useState(null);
  const [pingCount, setPingCount] = useState(0);
  const [passengerCount, setPassengerCount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Map data — shows the driver's own route
  const [stops, setStops] = useState([]);
  const [buses, setBuses] = useState([]);

  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const simRef = useRef(null);

  useEffect(() => {
    driverApi.getAssignment()
      .then((data) => {
        setAssignment(data);
        if (data.status === "active") setTripActive(true);
        // Load route stops for the map
        if (data.route_id) {
          routesApi.live(data.route_id).then((liveData) => {
            setStops(liveData.stops);
            setBuses(liveData.buses);
          });
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  // Keep the map bus marker in sync with location pings
  useEffect(() => {
    if (!location || !assignment) return;
    setBuses((prev) => {
      const idx = prev.findIndex((b) => b.bus_id === assignment.id);
      const busData = {
        bus_id: assignment.id,
        bus_number: assignment.bus_number,
        lat: location.lat,
        lng: location.lng,
        speed: location.speed,
        passenger_count: passengerCount,
        etas: [],
      };
      if (idx === -1) return [...prev, busData];
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...busData };
      return updated;
    });
  }, [location, passengerCount]);

  async function startTrip() {
    setLoading(true);
    setError("");
    try {
      await driverApi.startTrip();
      setTripActive(true);
      startTracking();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function endTrip() {
    setLoading(true);
    setError("");
    try {
      await driverApi.endTrip();
      setTripActive(false);
      stopTracking();
      stopSimulation();
      setPingCount(0);
      setPassengerCount(0);
      setBuses([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function startTracking() {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed ? (pos.coords.speed * 3.6) : 0,
        });
      },
      (err) => setError("GPS error: " + err.message),
      { enableHighAccuracy: true, maximumAge: 3000 }
    );

    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const speed = pos.coords.speed ? (pos.coords.speed * 3.6) : 0;
          try {
            await driverApi.sendLocation({
              bus_id: assignment.id,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              speed: Math.round(speed * 10) / 10,
            });
            setPingCount((c) => c + 1);
          } catch (err) {
            console.error("Location send failed:", err);
          }
        },
        null,
        { enableHighAccuracy: true, maximumAge: 3000 }
      );
    }, 5000);
  }

  function stopTracking() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  async function handlePassengerUpdate(newCount) {
    const count = Math.max(0, Number(newCount) || 0);
    setPassengerCount(count);
    try {
      await driverApi.updatePassengerCount(count);
    } catch (err) {
      console.error("Passenger update failed:", err);
    }
  }

  async function startSimulation() {
    if (!assignment?.route_id) return;
    setError("");

    if (!tripActive) {
      try {
        await driverApi.startTrip();
        setTripActive(true);
      } catch (err) {
        setError(err.message);
        return;
      }
    }

    let routeData;
    try {
      routeData = await routesApi.get(assignment.route_id);
    } catch (err) {
      setError("Failed to load route: " + err.message);
      return;
    }

    const routeStops = routeData.stops;
    if (routeStops.length < 2) return;

    const waypoints = [];
    for (let i = 0; i < routeStops.length - 1; i++) {
      const from = routeStops[i];
      const to = routeStops[i + 1];
      for (let j = 0; j <= 10; j++) {
        const t = j / 10;
        waypoints.push({
          lat: from.lat + (to.lat - from.lat) * t,
          lng: from.lng + (to.lng - from.lng) * t,
          speed: 15 + Math.random() * 20,
        });
      }
    }

    setSimulating(true);
    let idx = 0;

    simRef.current = setInterval(async () => {
      if (idx >= waypoints.length) idx = 0;
      const wp = waypoints[idx];
      setLocation({ lat: wp.lat, lng: wp.lng, speed: wp.speed });

      try {
        await driverApi.sendLocation({
          bus_id: assignment.id,
          lat: wp.lat,
          lng: wp.lng,
          speed: Math.round(wp.speed * 10) / 10,
        });
        setPingCount((c) => c + 1);
      } catch (err) {
        console.error("Sim send failed:", err);
      }
      idx++;
    }, 2000);
  }

  function stopSimulation() {
    if (simRef.current) {
      clearInterval(simRef.current);
      simRef.current = null;
    }
    setSimulating(false);
  }

  useEffect(() => {
    return () => { stopTracking(); stopSimulation(); };
  }, []);

  if (!assignment) {
    return (
      <div className="driver-page">
        <div className="driver-card">
          <h2>🚌 Driver Panel</h2>
          {error ? <div className="form-error">{error}</div> : <p className="loading-text">Loading assignment...</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="driver-split">
      {/* Left: controls */}
      <div className="driver-panel-side">
        <div className="driver-card">
          <h2>🚌 Driver Panel</h2>
          <p className="driver-greeting">Welcome, {user.name}</p>

          <div className="assignment-info">
            <div className="info-row">
              <span className="info-label">Bus</span>
              <span className="info-value">{assignment.bus_number}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Route</span>
              <span className="info-value">{assignment.route_name || "N/A"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status</span>
              <span className={`status-badge ${tripActive ? "active" : "inactive"}`}>
                {tripActive ? "🟢 Active" : "🔴 Inactive"}
              </span>
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          {tripActive && (
            <div className="assignment-info" style={{ textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "#475569", marginBottom: 8 }}>👥 Passengers on board</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={() => handlePassengerUpdate(passengerCount - 1)}>−</button>
                <span style={{ fontSize: 28, fontWeight: 700, minWidth: 48 }}>{passengerCount}</span>
                <button className="btn btn-primary btn-sm" onClick={() => handlePassengerUpdate(passengerCount + 1)}>+</button>
              </div>
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Tap +/− as passengers board or exit</p>
            </div>
          )}

          {!tripActive ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-success btn-lg" onClick={startTrip} disabled={loading}>
                {loading ? "Starting..." : "▶ Start Trip (Real GPS)"}
              </button>
              <button className="btn btn-primary btn-lg" onClick={startSimulation} disabled={loading}>
                🎮 Simulate Trip (Demo)
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {!simulating && (
                <button className="btn btn-primary btn-lg" onClick={startSimulation}>🎮 Start Simulation</button>
              )}
              {simulating && (
                <button className="btn btn-warning btn-lg" onClick={stopSimulation}>⏸ Pause Simulation</button>
              )}
              <button className="btn btn-danger btn-lg" onClick={endTrip} disabled={loading}>
                {loading ? "Ending..." : "⏹ End Trip"}
              </button>
            </div>
          )}

          {tripActive && (
            <div className="tracking-status">
              <div className="pulse-dot"></div>
              <span>{simulating ? "🎮 Simulating" : "📡 Tracking"} — {pingCount} pings sent</span>
              {location && (
                <p className="location-text">
                  📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)} | 🏎️ {Math.round(location.speed)} km/h
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: live map */}
      <div className="driver-map-side">
        <BusMap stops={stops} buses={buses} />
      </div>
    </div>
  );
}
