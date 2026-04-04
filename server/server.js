const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { clerkMiddleware, getAuth } = require('@clerk/express');
require("dotenv").config({ override: true });

console.log("[ENV Check] CLERK_SECRET_KEY exists:", !!process.env.CLERK_SECRET_KEY);
console.log("[ENV Check] CLERK_PUBLISHABLE_KEY exists:", !!process.env.CLERK_PUBLISHABLE_KEY);

const app = express();
const server = http.createServer(app);

app.use(cors());
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
  console.log(`[DEBUG-AUTH] ${req.method} ${req.url} | Auth Header: ${!!req.headers.authorization} | req.auth.userId: ${auth?.userId}`);

  try {
    if (auth?.userId) {
      const settings = await UserSettings.findOne({ clerkUserId: auth.userId });
      if (settings) {
        console.log(`[WALLET] 📂 Found wallet for user: ${auth.userId}`);
        const decryptedStr = decrypt(settings.encryptedKeys, settings.iv, settings.authTag);
        if (decryptedStr) {
          apiKeys = JSON.parse(decryptedStr);
          console.log(`[WALLET] ✅ Loaded ${apiKeys.length} keys from wallet.`);
        }
      } else {
        console.log(`[WALLET] ❓ No wallet found in DB for user: ${auth.userId}`);
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
