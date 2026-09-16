const router = require("express").Router();
const pool = require("../db");
const requireAuth = require("../middleware/auth");
const { computeEtas } = require("../utils/geo");

// GET /api/driver/assignment — returns the bus assigned to this driver
router.get("/assignment", requireAuth("driver"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.bus_number, b.status, r.id AS route_id, r.name AS route_name
       FROM buses b
       LEFT JOIN routes r ON r.id = b.route_id
       WHERE b.driver_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No bus assigned to you" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Assignment fetch error:", err);
    res.status(500).json({ error: "Failed to fetch assignment" });
  }
});

// POST /api/driver/trip/start — begin a new trip
router.post("/trip/start", requireAuth("driver"), async (req, res) => {
  try {
    const bus = await pool.query(
      "SELECT id, route_id FROM buses WHERE driver_id = $1",
      [req.user.id]
    );

    if (bus.rows.length === 0) {
      return res.status(404).json({ error: "No bus assigned" });
    }

    const { id: busId, route_id: routeId } = bus.rows[0];

    await pool.query("UPDATE buses SET status = 'active' WHERE id = $1", [busId]);

    const trip = await pool.query(
      `INSERT INTO trips (bus_id) VALUES ($1)
       RETURNING id, bus_id, started_at, status`,
      [busId]
    );

    const io = req.app.get("io");
    io.to("route:" + routeId).emit("bus_active", {
      bus_id: busId,
      route_id: routeId,
    });

    res.status(201).json(trip.rows[0]);
  } catch (err) {
    console.error("Trip start error:", err);
    res.status(500).json({ error: "Failed to start trip" });
  }
});

// POST /api/driver/trip/end — finish the current trip
router.post("/trip/end", requireAuth("driver"), async (req, res) => {
  try {
    const bus = await pool.query(
      "SELECT id, route_id FROM buses WHERE driver_id = $1",
      [req.user.id]
    );

    if (bus.rows.length === 0) {
      return res.status(404).json({ error: "No bus assigned" });
    }

    const { id: busId, route_id: routeId } = bus.rows[0];

    await pool.query("UPDATE buses SET status = 'inactive' WHERE id = $1", [busId]);

    await pool.query(
      `UPDATE trips SET ended_at = NOW(), status = 'completed'
       WHERE bus_id = $1 AND status = 'in_progress'`,
      [busId]
    );

    const io = req.app.get("io");
    io.to("route:" + routeId).emit("bus_inactive", { bus_id: busId });

    res.json({ message: "Trip ended" });
  } catch (err) {
    console.error("Trip end error:", err);
    res.status(500).json({ error: "Failed to end trip" });
  }
});

// POST /api/driver/location — log GPS ping, compute ETAs, broadcast
router.post("/location", requireAuth("driver"), async (req, res) => {
  try {
    const { bus_id, lat, lng, speed } = req.body;

    // Verify this driver owns this bus
    const bus = await pool.query(
      "SELECT id, route_id FROM buses WHERE id = $1 AND driver_id = $2",
      [bus_id, req.user.id]
    );

    if (bus.rows.length === 0) {
      return res.status(403).json({ error: "Not your assigned bus" });
    }

    const routeId = bus.rows[0].route_id;

    await pool.query(
      `INSERT INTO live_locations (bus_id, lat, lng, speed)
       VALUES ($1, $2, $3, $4)`,
      [bus_id, lat, lng, speed || 0]
    );

    // Rolling speed average from last 10 pings
    const speedResult = await pool.query(
      `SELECT speed FROM live_locations
       WHERE bus_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [bus_id]
    );

    const speeds = speedResult.rows.map((r) => r.speed).filter((s) => s > 0);
    const avgSpeed =
      speeds.length >= 3
        ? speeds.reduce((a, b) => a + b, 0) / speeds.length
        : 20;

    const stopsResult = await pool.query(
      `SELECT id, name, lat, lng, sequence_number
       FROM stops WHERE route_id = $1 ORDER BY sequence_number`,
      [routeId]
    );

    const etas = computeEtas(lat, lng, stopsResult.rows, avgSpeed);

    // Also grab current passenger count to send to commuters
    const busInfo = await pool.query(
      "SELECT passenger_count FROM buses WHERE id = $1", [bus_id]
    );

    const payload = {
      bus_id: Number(bus_id),
      lat: Number(lat),
      lng: Number(lng),
      speed: Number(speed || 0),
      avg_speed_kmh: Math.round(avgSpeed * 10) / 10,
      passenger_count: busInfo.rows[0].passenger_count,
      etas,
      timestamp: new Date().toISOString(),
    };

    const io = req.app.get("io");
    io.to("route:" + routeId).emit("location_update", payload);

    res.json({ message: "Location logged", etas });
  } catch (err) {
    console.error("Location log error:", err);
    res.status(500).json({ error: "Failed to log location" });
  }
});

// PATCH /api/driver/passenger-count — conductor updates how many people are on the bus
router.patch("/passenger-count", requireAuth("driver"), async (req, res) => {
  try {
    const { count } = req.body;

    if (count == null || count < 0) {
      return res.status(400).json({ error: "Count must be 0 or more" });
    }

    const bus = await pool.query(
      "SELECT id, route_id FROM buses WHERE driver_id = $1",
      [req.user.id]
    );

    if (bus.rows.length === 0) {
      return res.status(404).json({ error: "No bus assigned" });
    }

    await pool.query(
      "UPDATE buses SET passenger_count = $1 WHERE id = $2",
      [count, bus.rows[0].id]
    );

    // Broadcast updated count to commuters watching this route
    const io = req.app.get("io");
    io.to("route:" + bus.rows[0].route_id).emit("passenger_update", {
      bus_id: bus.rows[0].id,
      passenger_count: count,
    });

    res.json({ passenger_count: count });
  } catch (err) {
    console.error("Passenger count error:", err);
    res.status(500).json({ error: "Failed to update passenger count" });
  }
});

module.exports = router;
