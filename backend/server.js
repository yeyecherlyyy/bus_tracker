require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const pool = require("./db");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// Make io available to route handlers via req.app.get('io')
app.set("io", io);

app.use(cors());
app.use(express.json());

// --- Mount routes ---
app.use("/api/auth", require("./routes/auth"));
app.use("/api/driver", require("./routes/driver"));
app.use("/api/routes", require("./routes/routes"));
app.use("/api/issues", require("./routes/issues"));
app.use("/api/lostfound", require("./routes/lostfound"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/chat", require("./routes/chat"));

// --- Socket.io room management ---
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("join_route", (routeId) => {
    socket.join("route:" + routeId);
    console.log(`${socket.id} joined route:${routeId}`);
  });

  socket.on("leave_route", (routeId) => {
    socket.leave("route:" + routeId);
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// --- Stale bus check: every 60s, mark buses with no ping in 5 minutes as inactive ---
setInterval(async () => {
  try {
    const stale = await pool.query(
      `SELECT b.id AS bus_id, b.route_id
       FROM buses b
       WHERE b.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM live_locations ll
           WHERE ll.bus_id = b.id
             AND ll.created_at > NOW() - INTERVAL '5 minutes'
         )`
    );

    for (const bus of stale.rows) {
      await pool.query("UPDATE buses SET status = 'inactive' WHERE id = $1", [bus.bus_id]);

      await pool.query(
        `UPDATE trips SET ended_at = NOW(), status = 'completed'
         WHERE bus_id = $1 AND status = 'in_progress'`,
        [bus.bus_id]
      );

      io.to("route:" + bus.route_id).emit("bus_inactive", { bus_id: bus.bus_id });
      console.log(`Stale bus ${bus.bus_id} marked inactive`);
    }
  } catch (err) {
    console.error("Stale bus check error:", err);
  }
}, 60 * 1000);

// --- Start server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`TrackMyBus backend running on port ${PORT}`);
});
