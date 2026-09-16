const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "trackmybus-jwt-secret-change-in-production";

// Returns middleware that verifies JWT and optionally checks role.
// Usage: requireAuth() for any logged-in user, requireAuth("admin") for admin only.
function requireAuth(role) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid token" });
    }

    const token = header.split(" ")[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      return res.status(401).json({ error: "Token expired or invalid" });
    }

    if (role && req.user.role !== role) {
      return res.status(403).json({ error: `Requires ${role} role` });
    }

    next();
  };
}

module.exports = requireAuth;
