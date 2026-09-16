# TrackMyBus — Manual Test Script / Demo Walkthrough

Use this as both a test checklist and a live demo script.

## 1. Auth Flow

- [ ] Open app at http://localhost:5173 — commuter map loads without login
- [ ] Click "Login" → enter phone `9999900001`, password `password123` → logged in as driver
- [ ] "Driver Panel" link appears in navbar
- [ ] Log out → click "Login" → enter phone `9999900000`, password `password123` → logged in as admin
- [ ] "Admin Panel" link appears in navbar
- [ ] Wrong password → shows "Invalid phone or password" error
- [ ] Sign up with an existing phone → shows "Phone number already registered"

## 2. Commuter Flow

- [ ] Select "Bhopal Junction - BHEL" from the route dropdown
- [ ] Map zooms to show 5 stops connected by a dashed cyan line
- [ ] Stop markers show name + sequence number on click
- [ ] If no buses are active, panel shows "No active buses on this route"

## 3. Driver Flow

- [ ] Log in as driver (9999900001 / password123)
- [ ] Navigate to #/driver → shows bus BH-01 assigned
- [ ] Click "Start Trip" → status changes to Active, tracking starts
- [ ] Ping count increments every ~5 seconds
- [ ] GPS coordinates and speed displayed
- [ ] Click "End Trip" → status returns to Inactive

## 4. Real-Time Updates

- [ ] Open two browser tabs: commuter (route 1) + driver (9999900001)
- [ ] Driver starts trip → commuter sees bus marker appear on map
- [ ] Driver's pings update bus position on commuter map in real-time
- [ ] ETA cards show next 3 stops with estimated minutes
- [ ] Driver ends trip → bus marker disappears from commuter map

## 5. Issue Reporting & Severity

- [ ] On commuter page, click "Report Issue"
- [ ] Select a bus, category "overcrowding", submit → success
- [ ] Report same bus + category 2 more times (3 total)
- [ ] Log in as admin → Issues tab → severity shows "MEDIUM" (3 flags)
- [ ] Report 3 more times (6 total) → severity shows "HIGH"
- [ ] Admin clicks "Resolve" → issue disappears from list
- [ ] Report again → severity back to "LOW" (fresh count after resolve)

## 6. Lost & Found

- [ ] On commuter page, click "Lost & Found"
- [ ] Select "I lost something", pick a route, describe item, enter phone → submit
- [ ] Log in as admin → Lost & Found tab → item appears with status "open"
- [ ] Click "Match" → status changes to "matched"
- [ ] Click "Close" → status changes to "closed"

## 7. AI Chatbot

- [ ] Click the 💬 FAB on commuter page → chat opens
- [ ] Type "When is the next bus on route 1?" → bot calls get_next_bus_eta, responds with ETA
- [ ] Type "How do I get from New Market to BHEL?" → bot calls find_route, responds with route name
- [ ] Type "Bus BH-01 is too crowded" → bot calls report_issue, confirms report
- [ ] Test voice: click 🎤, speak, text appears and sends automatically
- [ ] Type 11 messages quickly → rate limit error on 11th

## 8. Admin CRUD

- [ ] Log in as admin → Admin Panel
- [ ] Routes tab: add a new route → appears in list
- [ ] Routes tab: delete a route → removed (cascades stops)
- [ ] Buses tab: add a new bus → appears in list
- [ ] Buses tab: delete a bus → removed

## 9. Stale Bus Cleanup

- [ ] Start a driver trip, then close the driver tab (stop sending pings)
- [ ] Wait 5+ minutes → backend should mark bus inactive
- [ ] Commuter page: bus marker should disappear

## 10. Security Checks

- [ ] Access admin endpoints without token → 401
- [ ] Access admin endpoints with driver token → 403
- [ ] Access driver endpoints with admin token → 403
- [ ] Location POST with wrong bus_id → 403 "Not your assigned bus"
- [ ] GET /api/routes/:id/live response never contains driver_id or phone
