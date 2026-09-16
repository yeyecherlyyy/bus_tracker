import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { routesApi } from "../../api/endpoints";

// Bhopal center
const BHOPAL_CENTER = [23.2599, 77.4126];

const busIcon = L.divIcon({
  html: '<div class="bus-marker-icon">🚌</div>',
  className: "bus-div-icon",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const stopIcon = L.divIcon({
  html: '<div class="stop-marker-icon">📍</div>',
  className: "stop-div-icon",
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

// Fits map bounds to show all stops
function FitBounds({ stops }) {
  const map = useMap();

  useEffect(() => {
    if (stops.length === 0) return;
    const bounds = L.latLngBounds(stops.map((s) => [s.lat, s.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [stops, map]);

  return null;
}

// WhatsApp-style animated bus marker — smoothly slides to new position
function AnimatedBusMarker({ bus }) {
  const markerRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const start = marker.getLatLng();
    const end = L.latLng(bus.lat, bus.lng);

    if (start.lat === end.lat && start.lng === end.lng) return;

    const startTime = Date.now();
    const duration = 2000; // 2 second smooth glide

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out: fast start, smooth stop — feels natural
      const eased = 1 - Math.pow(1 - progress, 3);

      const lat = start.lat + (end.lat - start.lat) * eased;
      const lng = start.lng + (end.lng - start.lng) * eased;
      marker.setLatLng([lat, lng]);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    }

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animate();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [bus.lat, bus.lng]);

  // Crowding label for popup
  let crowdText = "";
  if (bus.passenger_count != null) {
    if (bus.passenger_count <= 15) crowdText = "🟢 Empty";
    else if (bus.passenger_count <= 35) crowdText = "🔵 Available";
    else if (bus.passenger_count <= 50) crowdText = "🟡 Crowded";
    else crowdText = "🔴 Full";
  }

  return (
    <Marker ref={markerRef} position={[bus.lat, bus.lng]} icon={busIcon}>
      <Popup>
        <strong>{bus.bus_number}</strong><br />
        Speed: {Math.round(bus.speed)} km/h<br />
        {bus.passenger_count != null && (
          <>Passengers: {bus.passenger_count} ({crowdText})<br /></>
        )}
        {bus.etas?.[0] && (
          <>Next: {bus.etas[0].stop_name} (~{bus.etas[0].eta_minutes} min)</>
        )}
      </Popup>
    </Marker>
  );
}

// Stop marker with waiting count and "I'm here" check-in button
function StopMarker({ stop }) {
  const [waitingCount, setWaitingCount] = useState(stop.waiting_count || 0);
  const [checkedIn, setCheckedIn] = useState(false);

  async function handleCheckin() {
    try {
      const result = await routesApi.checkin(stop.id);
      setWaitingCount(result.waiting_count);
      setCheckedIn(true);
    } catch (err) {
      console.error("Check-in failed:", err);
    }
  }

  // Sync with prop updates
  useEffect(() => {
    setWaitingCount(stop.waiting_count || 0);
  }, [stop.waiting_count]);

  return (
    <Marker position={[stop.lat, stop.lng]} icon={stopIcon}>
      <Popup>
        <strong>{stop.name}</strong><br />
        Stop #{stop.sequence_number}<br />
        <span style={{ color: "#003366", fontWeight: 600 }}>
          👥 {waitingCount} people waiting
        </span>
        <br />
        {!checkedIn ? (
          <button
            onClick={handleCheckin}
            style={{
              marginTop: 6,
              padding: "5px 12px",
              background: "#003366",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            📍 I'm waiting here
          </button>
        ) : (
          <span style={{ color: "#16a34a", fontSize: 12 }}>✅ Checked in!</span>
        )}
      </Popup>
    </Marker>
  );
}

export default function BusMap({ stops, buses }) {
  const routeLine = stops.map((s) => [s.lat, s.lng]);

  return (
    <MapContainer
      center={BHOPAL_CENTER}
      zoom={13}
      className="bus-map"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBounds stops={stops} />

      {routeLine.length > 1 && (
        <Polyline
          positions={routeLine}
          pathOptions={{ color: "#003366", weight: 4, opacity: 0.6, dashArray: "10 6" }}
        />
      )}

      {stops.map((stop) => (
        <StopMarker key={`stop-${stop.id}`} stop={stop} />
      ))}

      {buses.map((bus) => (
        <AnimatedBusMarker key={`bus-${bus.bus_id}`} bus={bus} />
      ))}
    </MapContainer>
  );
}
