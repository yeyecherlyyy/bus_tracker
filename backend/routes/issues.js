const router = require("express").Router();
const pool = require("../db");
const requireAuth = require("../middleware/auth");

// POST /api/issues — anyone can flag an issue (no auth needed for commuters)
router.post("/", async (req, res) => {
  try {
    const { bus_id, category, description } = req.body;

    if (!bus_id || !category) {
      return res.status(400).json({ error: "bus_id and category are required" });
    }

    const result = await pool.query(
      `INSERT INTO issue_flags (bus_id, category, description)
       VALUES ($1, $2, $3) RETURNING *`,
      [bus_id, category, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    // 23514 = check constraint violation (invalid category)
    if (err.code === "23514") {
      return res.status(400).json({ error: "Invalid category" });
    }
    console.error("Create issue error:", err);
    res.status(500).json({ error: "Failed to create issue" });
  }
});

// GET /api/issues — admin view: severity derived at query time, never stored
router.get("/", requireAuth("admin"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT bus_id, b.bus_number, category, COUNT(*) AS flag_count,
         CASE WHEN COUNT(*) >= 6 THEN 'high'
              WHEN COUNT(*) >= 3 THEN 'medium'
              ELSE 'low' END AS severity
       FROM issue_flags f
       JOIN buses b ON b.id = f.bus_id
       WHERE f.resolved = false
         AND f.created_at > NOW() - INTERVAL '7 days'
       GROUP BY bus_id, b.bus_number, category
       ORDER BY flag_count DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("List issues error:", err);
    res.status(500).json({ error: "Failed to fetch issues" });
  }
});

// PATCH /api/issues/:busId/:category/resolve — resolve all flags for a bus+category
router.patch("/:busId/:category/resolve", requireAuth("admin"), async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE issue_flags SET resolved = true
       WHERE bus_id = $1 AND category = $2 AND resolved = false
       RETURNING id`,
      [req.params.busId, req.params.category]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No unresolved flags found" });
    }

    res.json({ resolved_count: result.rows.length });
  } catch (err) {
    console.error("Resolve issue error:", err);
    res.status(500).json({ error: "Failed to resolve issues" });
  }
});

module.exports = router;
