const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
require("dotenv").config({ override: true });

console.log("[ENV Check] CLERK_SECRET_KEY exists:", !!process.env.CLERK_SECRET_KEY);
console.log("[ENV Check] CLERK_PUBLISHABLE_KEY exists:", !!process.env.CLERK_PUBLISHABLE_KEY);

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// REST Routes
app.use("/api/extract", require("./routes/extract"));
app.use("/api/interviews", require("./routes/interview"));
app.use("/api/resume", require("./routes/resumeRoutes"));
app.use("/api/sessions", require("./routes/sessionRoutes"));

// Legacy fallbacks
app.post("/api/extract", require("./controllers/extractController").extractQuestions);
app.post("/extract", require("./controllers/extractController").extractQuestions);

app.get("/", (req, res) => res.send("CrackIt API is running"));

// Error handling
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

// Attach WebSocket server
const { attachWebSocket } = require("./services/websocketService");
attachWebSocket(server);

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (HTTP + WebSocket)`);
});
