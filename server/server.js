const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const extractRoute = require("./routes/extract");
require("dotenv").config();
const app = express();

app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

app.use("/extract", extractRoute);

app.get("/", (req, res) => {
  res.send("API is running");
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
