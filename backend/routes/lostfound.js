const router = require("express").Router();
const pool = require("../db");

// POST /api/lostfound — report a lost or found item
router.post("/", async (req, res) => {
  try {
    const { type, route_id, bus_id, description, contact_phone } = req.body;

    if (!type || !description || !contact_phone) {
      return res
        .status(400)
        .json({ error: "type, description, and contact_phone are required" });
    }

    const result = await pool.query(
      `INSERT INTO lost_found_items (type, route_id, bus_id, description, contact_phone)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [type, route_id || null, bus_id || null, description, contact_phone]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23514") {
      return res.status(400).json({ error: "type must be 'lost' or 'found'" });
    }
    console.error("Create lost/found error:", err);
    res.status(500).json({ error: "Failed to create item" });
  }
});

// GET /api/lostfound — list items, optional filters: ?type=lost&route_id=1&status=open
router.get("/", async (req, res) => {
  try {
    const conditions = [];
    const params = [];

    if (req.query.type) {
      params.push(req.query.type);
      conditions.push(`lf.type = $${params.length}`);
    }
    if (req.query.route_id) {
      params.push(req.query.route_id);
      conditions.push(`lf.route_id = $${params.length}`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      conditions.push(`lf.status = $${params.length}`);
    }

    const where = conditions.length
      ? "WHERE " + conditions.join(" AND ")
      : "";

    const result = await pool.query(
      `SELECT lf.*, r.name AS route_name, b.bus_number
       FROM lost_found_items lf
       LEFT JOIN routes r ON r.id = lf.route_id
       LEFT JOIN buses b ON b.id = lf.bus_id
       ${where}
       ORDER BY lf.occurred_at DESC`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error("List lost/found error:", err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// PATCH /api/lostfound/:id — update status (open → matched → closed)
router.patch("/:id", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["open", "matched", "closed"].includes(status)) {
      return res.status(400).json({ error: "Status must be open, matched, or closed" });
    }

    const result = await pool.query(
      `UPDATE lost_found_items SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update lost/found error:", err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

module.exports = router;
