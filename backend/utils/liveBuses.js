const pool = require("../db");
const { computeEtas } = require("./geo");

// Returns all active buses on a route with their latest position and ETAs.
// Used by both GET /api/routes/:id/live and the chatbot tool.
async function getLiveBusesForRoute(routeId) {
  // Active buses with their most recent location (DISTINCT ON = latest per bus)
  const busesResult = await pool.query(
    `SELECT DISTINCT ON (b.id)
       b.id AS bus_id, b.bus_number, b.passenger_count,
       ll.lat, ll.lng, ll.speed, ll.created_at
     FROM buses b
     JOIN live_locations ll ON ll.bus_id = b.id
     WHERE b.route_id = $1 AND b.status = 'active'
     ORDER BY b.id, ll.created_at DESC`,
    [routeId]
  );

  const stopsResult = await pool.query(
    `SELECT id, name, lat, lng, sequence_number
     FROM stops WHERE route_id = $1
     ORDER BY sequence_number`,
    [routeId]
  );

  const stops = stopsResult.rows;
  const buses = [];

  for (const bus of busesResult.rows) {
    // Rolling average speed from last 10 pings
    const speedResult = await pool.query(
      `SELECT speed FROM live_locations
       WHERE bus_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [bus.bus_id]
    );

    const speeds = speedResult.rows
      .map((r) => r.speed)
      .filter((s) => s > 0);

    // Why 20 km/h fallback: average city bus speed in Indian cities;
    // safe default when GPS speed data is sparse
    const avgSpeed =
      speeds.length >= 3
        ? speeds.reduce((a, b) => a + b, 0) / speeds.length
        : 20;

    const etas = computeEtas(bus.lat, bus.lng, stops, avgSpeed);

    buses.push({
      bus_id: bus.bus_id,
      bus_number: bus.bus_number,
      lat: Number(bus.lat),
      lng: Number(bus.lng),
      speed: Number(bus.speed),
      passenger_count: bus.passenger_count,
      last_update: bus.created_at,
      avg_speed_kmh: Math.round(avgSpeed * 10) / 10,
      etas,
    });
  }

  return { buses, stops };
}

module.exports = { getLiveBusesForRoute };
