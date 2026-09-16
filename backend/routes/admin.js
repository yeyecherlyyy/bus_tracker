const router = require("express").Router();
const pool = require("../db");
const requireAuth = require("../middleware/auth");

// All admin routes require admin role
router.use(requireAuth("admin"));

// --- Routes CRUD ---

router.post("/routes", async (req, res) => {
  try {
    const { name, start_point, end_point } = req.body;
    const result = await pool.query(
      `INSERT INTO routes (name, start_point, end_point)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, start_point, end_point]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create route error:", err);
    res.status(500).json({ error: "Failed to create route" });
  }
});

router.put("/routes/:id", async (req, res) => {
  try {
    const { name, start_point, end_point } = req.body;
    const result = await pool.query(
      `UPDATE routes SET name = $1, start_point = $2, end_point = $3
       WHERE id = $4 RETURNING *`,
      [name, start_point, end_point, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update route error:", err);
    res.status(500).json({ error: "Failed to update route" });
  }
});

router.delete("/routes/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM routes WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json({ deleted: true });
  } catch (err) {
    console.error("Delete route error:", err);
    res.status(500).json({ error: "Failed to delete route" });
  }
});

// --- Stops CRUD ---

router.post("/stops", async (req, res) => {
  try {
    const { route_id, name, lat, lng, sequence_number } = req.body;
    const result = await pool.query(
      `INSERT INTO stops (route_id, name, lat, lng, sequence_number)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [route_id, name, lat, lng, sequence_number]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create stop error:", err);
    res.status(500).json({ error: "Failed to create stop" });
  }
});

router.put("/stops/:id", async (req, res) => {
  try {
    const { name, lat, lng, sequence_number } = req.body;
    const result = await pool.query(
      `UPDATE stops SET name = $1, lat = $2, lng = $3, sequence_number = $4
       WHERE id = $5 RETURNING *`,
      [name, lat, lng, sequence_number, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update stop error:", err);
    res.status(500).json({ error: "Failed to update stop" });
  }
});

router.delete("/stops/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM stops WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json({ deleted: true });
  } catch (err) {
    console.error("Delete stop error:", err);
    res.status(500).json({ error: "Failed to delete stop" });
  }
});

// --- Buses CRUD ---

router.get("/buses", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, r.name AS route_name, u.name AS driver_name
       FROM buses b
       LEFT JOIN routes r ON r.id = b.route_id
       LEFT JOIN users u ON u.id = b.driver_id
       ORDER BY b.id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("List buses error:", err);
    res.status(500).json({ error: "Failed to fetch buses" });
  }
});

router.post("/buses", async (req, res) => {
  try {
    const { bus_number, route_id, driver_id } = req.body;
    const result = await pool.query(
      `INSERT INTO buses (bus_number, route_id, driver_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [bus_number, route_id || null, driver_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create bus error:", err);
    res.status(500).json({ error: "Failed to create bus" });
  }
});

router.put("/buses/:id", async (req, res) => {
  try {
    const { bus_number, route_id, driver_id } = req.body;
    const result = await pool.query(
      `UPDATE buses SET bus_number = $1, route_id = $2, driver_id = $3
       WHERE id = $4 RETURNING *`,
      [bus_number, route_id || null, driver_id || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update bus error:", err);
    res.status(500).json({ error: "Failed to update bus" });
  }
});

router.delete("/buses/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM buses WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json({ deleted: true });
  } catch (err) {
    console.error("Delete bus error:", err);
    res.status(500).json({ error: "Failed to delete bus" });
  }
});

module.exports = router;
