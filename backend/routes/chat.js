const router = require("express").Router();
const pool = require("../db");
const { getLiveBusesForRoute } = require("../utils/liveBuses");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Rate limit: 10 requests/min per IP (in-memory, no Redis for MVP)
const rateMap = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// --- Tool implementations (same code paths as REST endpoints) ---

async function getNextBusEta(routeIdOrName) {
  // Try numeric ID first, then name search
  let routeId = Number(routeIdOrName);

  if (isNaN(routeId)) {
    const result = await pool.query(
      "SELECT id FROM routes WHERE LOWER(name) LIKE $1 LIMIT 1",
      [`%${routeIdOrName.toLowerCase()}%`]
    );
    if (result.rows.length === 0) return { error: "Route not found" };
    routeId = result.rows[0].id;
  }

  const data = await getLiveBusesForRoute(routeId);

  if (data.buses.length === 0) {
    return { message: "No active buses on this route right now" };
  }

  return {
    route_id: routeId,
    active_buses: data.buses.map((b) => ({
      bus_number: b.bus_number,
      etas: b.etas,
    })),
  };
}

async function findRoute(fromStop, toStop) {
  const result = await pool.query(
    `SELECT r.id, r.name, r.start_point, r.end_point,
       s1.name AS from_stop, s1.sequence_number AS from_seq,
       s2.name AS to_stop, s2.sequence_number AS to_seq
     FROM stops s1
     JOIN stops s2 ON s1.route_id = s2.route_id
     JOIN routes r ON r.id = s1.route_id
     WHERE LOWER(s1.name) LIKE $1
       AND LOWER(s2.name) LIKE $2
       AND s1.sequence_number < s2.sequence_number`,
    [`%${fromStop.toLowerCase()}%`, `%${toStop.toLowerCase()}%`]
  );

  if (result.rows.length === 0) {
    return { error: "No route found connecting those stops in that direction" };
  }

  return result.rows.map((r) => ({
    route: r.name,
    from: r.from_stop,
    to: r.to_stop,
  }));
}

async function reportIssue(busNumber, category, description) {
  const bus = await pool.query(
    "SELECT id FROM buses WHERE bus_number = $1",
    [busNumber]
  );

  if (bus.rows.length === 0) return { error: "Bus not found" };

  await pool.query(
    `INSERT INTO issue_flags (bus_id, category, description) VALUES ($1, $2, $3)`,
    [bus.rows[0].id, category, description]
  );

  return { success: true, message: `Issue reported for bus ${busNumber}` };
}

// Tool declarations for Gemini function calling
const tools = [
  {
    functionDeclarations: [
      {
        name: "get_next_bus_eta",
        description: "Get ETAs for the next bus on a specific route",
        parameters: {
          type: "object",
          properties: {
            route_id_or_name: {
              type: "string",
              description: "Route ID (number) or partial route name",
            },
          },
          required: ["route_id_or_name"],
        },
      },
      {
        name: "find_route",
        description: "Find a bus route that connects two stops",
        parameters: {
          type: "object",
          properties: {
            from_stop: { type: "string", description: "Starting stop name" },
            to_stop: { type: "string", description: "Destination stop name" },
          },
          required: ["from_stop", "to_stop"],
        },
      },
      {
        name: "report_issue",
        description: "Report a problem with a specific bus",
        parameters: {
          type: "object",
          properties: {
            bus_number: { type: "string", description: "Bus number like BH-01" },
            category: {
              type: "string",
              enum: ["overcrowding", "safety", "cleanliness", "delay", "driver_behavior", "mechanical"],
              description: "Issue category",
            },
            description: { type: "string", description: "Brief description" },
          },
          required: ["bus_number", "category", "description"],
        },
      },
    ],
  },
];

const SYSTEM_PROMPT =
  "You are a helpful transit assistant for TrackMyBus in Bhopal, India. " +
  "Reply in the user's language. Keep responses to max 2 sentences. " +
  "Only answer transit-related questions. Use the provided tools to look up " +
  "real-time bus data, find routes, or report issues.";

// POST /api/chat — Gemini function-calling chatbot
router.post("/", async (req, res) => {
  try {
    if (!checkRateLimit(req.ip)) {
      return res.status(429).json({ error: "Rate limit exceeded. Try again in a minute." });
    }

    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: message }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools,
      },
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    // Check if Gemini wants to call a function
    const functionCall = parts.find((p) => p.functionCall);

    if (functionCall) {
      const { name, args } = functionCall.functionCall;
      let toolResult;

      if (name === "get_next_bus_eta") {
        toolResult = await getNextBusEta(args.route_id_or_name);
      } else if (name === "find_route") {
        toolResult = await findRoute(args.from_stop, args.to_stop);
      } else if (name === "report_issue") {
        toolResult = await reportIssue(args.bus_number, args.category, args.description);
      }

      // Send tool result back to Gemini for a natural language response
      const followUp = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          { role: "user", parts: [{ text: message }] },
          { role: "model", parts: [functionCall] },
          {
            role: "user",
            parts: [
              {
                functionResponse: {
                  name,
                  response: toolResult,
                },
              },
            ],
          },
        ],
        config: { systemInstruction: SYSTEM_PROMPT },
      });

      const reply = followUp.candidates?.[0]?.content?.parts?.[0]?.text
        || "Sorry, I couldn't process that.";

      return res.json({ reply, tool_used: name, tool_data: toolResult });
    }

    // No function call — direct text response
    const reply = parts.find((p) => p.text)?.text
      || "Sorry, I can only help with transit questions.";

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Chat failed. Please try again." });
  }
});

module.exports = router;
