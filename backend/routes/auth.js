const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "trackmybus-jwt-secret-change-in-production";

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { phone, password, name, role } = req.body;

    if (!phone || !password || !name) {
      return res.status(400).json({ error: "phone, password, and name are required" });
    }

    const validRoles = ["driver", "admin"];
    const userRole = validRoles.includes(role) ? role : "driver";
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (phone, password_hash, role, name)
       VALUES ($1, $2, $3, $4) RETURNING id, phone, role, name`,
      [phone, passwordHash, userRole, name]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Phone number already registered" });
    }
    console.error("Signup error:", err);
    res.status(500).json({ error: err.message || "Signup failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: "phone and password are required" });
    }

    const result = await pool.query(
      "SELECT id, phone, password_hash, role, name FROM users WHERE phone = $1",
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid phone or password" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: "Invalid phone or password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.json({
      user: { id: user.id, phone: user.phone, role: user.role, name: user.name },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message || "Login failed" });
  }
});

module.exports = router;
