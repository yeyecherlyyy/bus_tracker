// MVP uses distance / rolling-speed heuristic for ETA.
// Phase 3 replaces this with a trained model — see literature survey for justification.

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Finds the nearest stop ahead of the bus, then walks forward up to 3 stops,
// summing haversine distance leg by leg.
// Returns: [{ stop_id, stop_name, eta_minutes, distance_km }]
function computeEtas(busLat, busLng, stops, avgSpeedKmh) {
  if (!stops.length || avgSpeedKmh <= 0) return [];

  // Find the nearest stop to the bus
  let nearestIdx = 0;
  let nearestDist = Infinity;

  for (let i = 0; i < stops.length; i++) {
    const d = haversineKm(busLat, busLng, stops[i].lat, stops[i].lng);
    if (d < nearestDist) {
      nearestDist = d;
      nearestIdx = i;
    }
  }

  // Start from the next stop ahead (the one after nearest)
  const startIdx = nearestIdx + 1;
  const etas = [];
  let cumulativeKm = haversineKm(busLat, busLng, stops[startIdx]?.lat, stops[startIdx]?.lng);

  for (let i = startIdx; i < stops.length && etas.length < 3; i++) {
    if (i > startIdx) {
      cumulativeKm += haversineKm(
        stops[i - 1].lat, stops[i - 1].lng,
        stops[i].lat, stops[i].lng
      );
    }

    const minutes = (cumulativeKm / avgSpeedKmh) * 60;

    etas.push({
      stop_id: stops[i].id,
      stop_name: stops[i].name,
      eta_minutes: Math.round(minutes),
      distance_km: Math.round(cumulativeKm * 10) / 10,
    });
  }

  return etas;
}

module.exports = { haversineKm, computeEtas };
