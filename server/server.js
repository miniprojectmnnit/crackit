const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const app = express();

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

app.use("/api/extract", require("./routes/extract"));
app.use("/api/interviews", require("./routes/interview"));

// Add direct fallbacks for both the new API path and the legacy extension path
app.post("/api/extract", require("./controllers/extractController").extractQuestions);
app.post("/extract", require("./controllers/extractController").extractQuestions);

app.get("/", (req, res) => {
  res.send("API is running");
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
