const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { clerkMiddleware, getAuth } = require('@clerk/express');
const jwt = require('jsonwebtoken');
require("dotenv").config({ override: true });

console.log("[ENV Check] CLERK_SECRET_KEY exists:", !!process.env.CLERK_SECRET_KEY);
console.log("[ENV Check] CLERK_PUBLISHABLE_KEY exists:", !!process.env.CLERK_PUBLISHABLE_KEY);

const app = express();
const server = http.createServer(app);

// app.use(cors());
app.use(cors({
  origin: [
    "https://crackit-interview.vercel.app", // Your Production Frontend
    "http://localhost:5173",                // Your Local Development
    "http://localhost:3000"                 // Optional: fallback local port
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true // Crucial if you ever use cookies or specific auth headers
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(clerkMiddleware({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY
}));

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

const requestContext = require("./utils/requestContext");
const UserSettings = require("./models/UserSettings");
const { decrypt } = require("./utils/cryptoUtils");

app.use(async (req, res, next) => {
  let apiKeys = [];
  const auth = getAuth(req);
  let userId = auth?.userId;

  // If no Clerk session, check for Extension Token (Option 3 Bridge)
  if (!userId && req.headers.authorization?.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.ENCRYPTION_SECRET);
      if (decoded.userId) {
        userId = decoded.userId;
        // DO NOT overwrite req.auth (Clerk might use it as a function or Proxy)
        // Instead, use a custom property for our bridge
        req.extensionAuth = { userId }; 
        console.log(`[DEBUG-AUTH] Extension Token verified for: ${userId}`);
      }
    } catch (err) {
      // Don't fail yet, just log. Routes like /api/extract will handle 401 if still missing.
      console.log(`[DEBUG-AUTH] Invalid Bearer token: ${err.message}`);
    }
  }

  console.log(`[DEBUG-AUTH] ${req.method} ${req.url} | Auth: ${!!userId} | User: ${userId}`);

  try {
    if (userId) {
      const settings = await UserSettings.findOne({ clerkUserId: userId });
      if (settings) {
        console.log(`[WALLET] 📂 Found wallet for user: ${userId}`);
        const decryptedStr = decrypt(settings.encryptedKeys, settings.iv, settings.authTag);
        if (decryptedStr) {
          apiKeys = JSON.parse(decryptedStr);
          console.log(`[WALLET] ✅ Loaded ${apiKeys.length} keys from wallet.`);
        }
      } else {
        console.log(`[WALLET] ❓ No wallet found in DB for user: ${userId}`);
      }
    }
  } catch (e) {
    console.error("[WALLET] ❌ Error loading wallet:", e.message);
  }

  requestContext.run({ apiKeys }, () => {
    next();
  });
});

// REST Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/extract", require("./routes/extract")); //done
app.use("/api/interviews", require("./routes/interview"));//done
app.use("/api/resume", require("./routes/resumeRoutes"));//done
app.use("/api/sessions", require("./routes/sessionRoutes"));//done
app.use("/api/settings", require("./routes/settingsRoutes"));

// Legacy fallbacks
app.post("/api/extract", require("./controllers/extractController").extractQuestions);
app.post("/extract", require("./controllers/extractController").extractQuestions);

app.get("/", (req, res) => res.json({ status: "running", message: "CrackIt API" }));

// 404 Catch-all
app.use((req, res, next) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Error handling
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.message);
  res.status(res.statusCode === 200 ? 500 : res.statusCode).json({
    error: err.message || "Internal Server Error"
  });
});

// Attach WebSocket server
const { attachWebSocket } = require("./services/websocketService");
attachWebSocket(server);

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (HTTP + WebSocket)`);
});
