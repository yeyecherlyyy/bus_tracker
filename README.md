# TrackMyBus 🚌

Real-time bus tracking system for Bhopal city transit. Built as a hackathon MVP with a focus on explainability — every file is readable in under 2 minutes.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TailwindCSS |
| Map | Leaflet.js + React-Leaflet + OpenStreetMap |
| Real-time | Socket.io |
| Backend | Node.js + Express |
| Database | PostgreSQL (raw SQL via `pg`) |
| Auth | JWT + bcrypt |
| AI Chat | Google Gemini Flash (function calling) |
| Voice | Browser Web Speech API |

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Google Gemini API key (for chatbot)

## Setup

### 1. Database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE trackmybus;"
```

### 2. Backend

```bash
cd backend
cp .env.example .env  # Edit with your DB credentials and Gemini API key
npm install
npm run migrate       # Creates tables + seed data
npm run dev           # Starts on port 5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev           # Starts on port 5173
```

## Environment Variables (backend/.env)

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/trackmybus
JWT_SECRET=your-secret-here
GEMINI_API_KEY=your-gemini-api-key
PORT=5000
```

## Seed Data

After running `npm run migrate`, you get:

| User | Phone | Password | Role |
|------|-------|----------|------|
| Admin User | 9999900000 | password123 | admin |
| Rajesh Kumar | 9999900001 | password123 | driver |
| Suresh Patel | 9999900002 | password123 | driver |

**Routes:** Bhopal Junction–BHEL, Karond–Bairagarh, DB Mall–Misrod (5 stops each)

**Buses:** BH-01 to BH-04 (BH-01 and BH-03 have assigned drivers)

## Architecture

```
Commuter Browser                    Driver Phone
     |                                   |
     | Socket.io (live updates)          | POST /location every 5s
     v                                   v
  +-----------------------------------------+
  |         Express + Socket.io             |
  |  /api/auth     /api/routes  /api/chat   |
  |  /api/driver   /api/issues  /api/admin  |
  |  /api/lostfound                         |
  +-----------------------------------------+
                    |
                    v
              PostgreSQL (8 tables)
```

## ETA Calculation

MVP uses a simple heuristic: `minutes = (haversine_distance / rolling_avg_speed) * 60`. Rolling average comes from the bus's last 10 GPS pings. Falls back to 20 km/h if fewer than 3 pings exist. Phase 3 would replace this with a trained model.

## Non-functional Notes

- **Bundle size:** [Check after build with `npm run build` in frontend/]
- **Ping-to-map latency:** [Measure locally — typical: 50-200ms over WebSocket]
- **JWT expiry:** 12 hours
- **All SQL queries use parameterized placeholders ($1, $2)**
- **Driver location never exposes driver_id/phone on public endpoints**
