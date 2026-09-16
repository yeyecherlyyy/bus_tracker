const router = require("express").Router();
const pool = require("../db");
const { getLiveBusesForRoute } = require("../utils/liveBuses");

// GET /api/routes — list all routes
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, start_point, end_point FROM routes ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("List routes error:", err);
    res.status(500).json({ error: "Failed to fetch routes" });
  }
});

// GET /api/routes/:id — single route with its stops
router.get("/:id", async (req, res) => {
  try {
    const route = await pool.query("SELECT * FROM routes WHERE id = $1", [
      req.params.id,
    ]);

    if (route.rows.length === 0) {
      return res.status(404).json({ error: "Route not found" });
    }

    const stops = await pool.query(
      `SELECT id, name, lat, lng, sequence_number
       FROM stops WHERE route_id = $1 ORDER BY sequence_number`,
      [req.params.id]
    );

    res.json({ ...route.rows[0], stops: stops.rows });
  } catch (err) {
    console.error("Get route error:", err);
    res.status(500).json({ error: "Failed to fetch route" });
  }
});

// GET /api/routes/:id/live — active buses + stops with waiting counts
router.get("/:id/live", async (req, res) => {
  try {
    const data = await getLiveBusesForRoute(req.params.id);

    // Add waiting_count to each stop (people who checked in within last 30 min)
    for (const stop of data.stops) {
      const result = await pool.query(
        `SELECT COUNT(*) AS count FROM stop_checkins
         WHERE stop_id = $1 AND created_at > NOW() - INTERVAL '30 minutes'`,
        [stop.id]
      );
      stop.waiting_count = parseInt(result.rows[0].count);
    }

    res.json(data);
  } catch (err) {
    console.error("Live route error:", err);
    res.status(500).json({ error: "Failed to fetch live data" });
  }
});

// POST /api/routes/stops/:stopId/checkin — commuter says "I'm waiting here"
router.post("/stops/:stopId/checkin", async (req, res) => {
  try {
    const { stopId } = req.params;

    const stop = await pool.query("SELECT id FROM stops WHERE id = $1", [stopId]);
    if (stop.rows.length === 0) {
      return res.status(404).json({ error: "Stop not found" });
    }

    await pool.query(
      "INSERT INTO stop_checkins (stop_id) VALUES ($1)",
      [stopId]
    );

    // Return updated count
    const result = await pool.query(
      `SELECT COUNT(*) AS count FROM stop_checkins
       WHERE stop_id = $1 AND created_at > NOW() - INTERVAL '30 minutes'`,
      [stopId]
    );

    res.json({ waiting_count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error("Stop checkin error:", err);
    res.status(500).json({ error: "Failed to check in" });
  }
});

module.exports = router;
