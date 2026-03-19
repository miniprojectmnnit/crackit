const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config({ override: true });

console.log("[ENV Check] CLERK_SECRET_KEY exists:", !!process.env.CLERK_SECRET_KEY);
console.log("[ENV Check] CLERK_PUBLISHABLE_KEY exists:", !!process.env.CLERK_PUBLISHABLE_KEY);

const app = express();

app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  if (req.headers.authorization) {
    console.log(`[AUTH] Header present: ${req.headers.authorization.substring(0, 15)}...`);
  } else {
    console.log(`[AUTH] No authorization header found`);
  }
  next();
});

app.use("/api/extract", require("./routes/extract"));
app.use("/api/interviews", require("./routes/interview"));
app.use("/api/resume", require("./routes/resumeRoutes"));

// Add direct fallbacks for both the new API path and the legacy extension path
app.post("/api/extract", require("./controllers/extractController").extractQuestions);
app.post("/extract", require("./controllers/extractController").extractQuestions);

app.get("/", (req, res) => {
  res.send("API is running");
});

// Error handling middleware for Clerk and other unhandled errors
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.message);
  if (err.message === 'Unauthenticated') {
    return res.status(401).json({ error: "Unauthenticated" });
  }
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
