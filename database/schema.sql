-- TrackMyBus MVP schema
-- Run via: npm run migrate (from /backend)

DROP TABLE IF EXISTS stop_checkins CASCADE;
DROP TABLE IF EXISTS lost_found_items CASCADE;
DROP TABLE IF EXISTS issue_flags CASCADE;
DROP TABLE IF EXISTS live_locations CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS buses CASCADE;
DROP TABLE IF EXISTS stops CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('driver', 'admin')),
  name VARCHAR(100) NOT NULL
);

CREATE TABLE routes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  start_point VARCHAR(200) NOT NULL,
  end_point VARCHAR(200) NOT NULL
);

CREATE TABLE stops (
  id SERIAL PRIMARY KEY,
  route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  sequence_number INTEGER NOT NULL
);

CREATE TABLE buses (
  id SERIAL PRIMARY KEY,
  bus_number VARCHAR(20) NOT NULL,
  route_id INTEGER REFERENCES routes(id),
  driver_id INTEGER REFERENCES users(id),
  status VARCHAR(10) NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
  passenger_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE trips (
  id SERIAL PRIMARY KEY,
  bus_id INTEGER NOT NULL REFERENCES buses(id),
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed'))
);

CREATE TABLE live_locations (
  id SERIAL PRIMARY KEY,
  bus_id INTEGER NOT NULL REFERENCES buses(id),
  lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  speed DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_live_locations_bus_time ON live_locations(bus_id, created_at);

CREATE TABLE issue_flags (
  id SERIAL PRIMARY KEY,
  bus_id INTEGER NOT NULL REFERENCES buses(id),
  category VARCHAR(30) NOT NULL CHECK (category IN (
    'overcrowding', 'safety', 'cleanliness',
    'delay', 'driver_behavior', 'mechanical'
  )),
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE lost_found_items (
  id SERIAL PRIMARY KEY,
  type VARCHAR(10) NOT NULL CHECK (type IN ('lost', 'found')),
  route_id INTEGER REFERENCES routes(id),
  bus_id INTEGER REFERENCES buses(id),
  description TEXT NOT NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
  contact_phone VARCHAR(20) NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'closed'))
);

-- Commuters tap "I'm waiting here" at a stop.
-- We count rows from the last 30 minutes to show how many people are waiting.
CREATE TABLE stop_checkins (
  id SERIAL PRIMARY KEY,
  stop_id INTEGER NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stop_checkins_recent ON stop_checkins(stop_id, created_at);
