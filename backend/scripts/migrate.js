// Runs schema.sql then inserts seed data with bcrypt-hashed passwords.
// Also creates active buses with live locations so the map has data on first load.
// Usage: npm run migrate

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const pool = require("../db");

async function migrate() {
  const schemaPath = path.join(__dirname, "../../database/schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");

  console.log("Running schema.sql...");
  await pool.query(schema);
  console.log("Tables created.");

  console.log("Inserting seed data...");

  // Users — password for all seed users is "password123"
  const hash = await bcrypt.hash("password123", 10);

  await pool.query(
    `INSERT INTO users (phone, password_hash, role, name) VALUES
     ($1, $2, 'admin', 'Admin User'),
     ($3, $2, 'driver', 'Rajesh Kumar'),
     ($4, $2, 'driver', 'Suresh Patel')`,
    ["9999900000", hash, "9999900001", "9999900002"]
  );

  // Routes — real Bhopal corridors
  await pool.query(
    `INSERT INTO routes (name, start_point, end_point) VALUES
     ('Bhopal Junction - BHEL', 'Bhopal Junction', 'BHEL'),
     ('Karond - Bairagarh', 'Karond Circle', 'Bairagarh'),
     ('DB Mall - Misrod', 'DB Mall', 'Misrod')`
  );

  // Stops — real Bhopal coordinates, 5 per route
  await pool.query(
    `INSERT INTO stops (route_id, name, lat, lng, sequence_number) VALUES
     (1, 'Bhopal Junction',  23.2689, 77.4124, 1),
     (1, 'Nadra Bus Stand',  23.2630, 77.4095, 2),
     (1, 'New Market',       23.2340, 77.4200, 3),
     (1, 'MP Nagar',         23.2295, 77.4343, 4),
     (1, 'BHEL',             23.2480, 77.4630, 5),

     (2, 'Karond Circle',    23.2830, 77.3850, 1),
     (2, 'Sultania Road',    23.2760, 77.3970, 2),
     (2, 'Hamidia Hospital', 23.2670, 77.4060, 3),
     (2, 'Pul Bogda',        23.2590, 77.4100, 4),
     (2, 'Bairagarh',        23.2870, 77.3570, 5),

     (3, 'DB Mall',          23.2330, 77.4370, 1),
     (3, 'Ashoka Garden',    23.2220, 77.4440, 2),
     (3, 'Govindpura',       23.2110, 77.4520, 3),
     (3, 'Kotra Sultanabad', 23.2000, 77.4600, 4),
     (3, 'Misrod',           23.1800, 77.4700, 5)`
  );

  // Buses — 4 buses, 2 with assigned drivers
  // BH-01 and BH-03 start as ACTIVE so the map has data immediately
  await pool.query(
    `INSERT INTO buses (bus_number, route_id, driver_id, status) VALUES
     ('BH-01', 1, 2, 'active'),
     ('BH-02', 1, NULL, 'inactive'),
     ('BH-03', 2, 3, 'active'),
     ('BH-04', 3, NULL, 'inactive')`
  );

  // Active trips for the active buses
  await pool.query(
    `INSERT INTO trips (bus_id, status) VALUES
     (1, 'in_progress'),
     (3, 'in_progress')`
  );

  // Seed live locations — 10 recent pings per active bus so rolling speed avg works
  // BH-01 on Route 1: moving from Nadra Bus Stand toward New Market
  const now = Date.now();
  const busOneLocations = [
    { lat: 23.2620, lng: 77.4098, speed: 22, offset: -45 },
    { lat: 23.2600, lng: 77.4100, speed: 25, offset: -40 },
    { lat: 23.2580, lng: 77.4105, speed: 28, offset: -35 },
    { lat: 23.2555, lng: 77.4110, speed: 24, offset: -30 },
    { lat: 23.2530, lng: 77.4120, speed: 20, offset: -25 },
    { lat: 23.2510, lng: 77.4130, speed: 26, offset: -20 },
    { lat: 23.2490, lng: 77.4140, speed: 23, offset: -15 },
    { lat: 23.2470, lng: 77.4150, speed: 27, offset: -10 },
    { lat: 23.2450, lng: 77.4160, speed: 21, offset: -5 },
    { lat: 23.2430, lng: 77.4170, speed: 24, offset: 0 },
  ];

  for (const loc of busOneLocations) {
    const ts = new Date(now + loc.offset * 1000).toISOString();
    await pool.query(
      `INSERT INTO live_locations (bus_id, lat, lng, speed, created_at)
       VALUES (1, $1, $2, $3, $4)`,
      [loc.lat, loc.lng, loc.speed, ts]
    );
  }

  // BH-03 on Route 2: moving from Karond toward Sultania
  const busThreeLocations = [
    { lat: 23.2825, lng: 77.3855, speed: 18, offset: -45 },
    { lat: 23.2818, lng: 77.3870, speed: 22, offset: -40 },
    { lat: 23.2810, lng: 77.3885, speed: 20, offset: -35 },
    { lat: 23.2803, lng: 77.3900, speed: 25, offset: -30 },
    { lat: 23.2795, lng: 77.3915, speed: 19, offset: -25 },
    { lat: 23.2788, lng: 77.3930, speed: 23, offset: -20 },
    { lat: 23.2780, lng: 77.3940, speed: 21, offset: -15 },
    { lat: 23.2775, lng: 77.3950, speed: 24, offset: -10 },
    { lat: 23.2770, lng: 77.3958, speed: 20, offset: -5 },
    { lat: 23.2765, lng: 77.3965, speed: 22, offset: 0 },
  ];

  for (const loc of busThreeLocations) {
    const ts = new Date(now + loc.offset * 1000).toISOString();
    await pool.query(
      `INSERT INTO live_locations (bus_id, lat, lng, speed, created_at)
       VALUES (3, $1, $2, $3, $4)`,
      [loc.lat, loc.lng, loc.speed, ts]
    );
  }

  // Seed a few lost & found items for the community page
  await pool.query(
    `INSERT INTO lost_found_items (type, route_id, description, contact_phone, status) VALUES
     ('lost', 1, 'Black laptop bag with HP laptop, left near back seat', '9876543210', 'open'),
     ('found', 2, 'Blue water bottle with stickers, found on floor near driver seat', '9876543211', 'open'),
     ('lost', 1, 'Pair of spectacles in brown case', '9876543212', 'open'),
     ('found', 3, 'Student ID card for MANIT Bhopal', '9876543213', 'matched')`
  );

  // Seed a few issue flags to demo severity
  await pool.query(
    `INSERT INTO issue_flags (bus_id, category, description) VALUES
     (1, 'overcrowding', 'Very crowded during morning hours'),
     (1, 'overcrowding', 'Standing room only, unsafe'),
     (1, 'overcrowding', 'Too many passengers, doors won''t close'),
     (3, 'delay', 'Bus running 15 minutes late')`
  );

  console.log("Seed data inserted (including active buses + live locations).");
  console.log("Migration complete!");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
