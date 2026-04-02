const express = require("express");
const router = express.Router();
const { requireAuth } = require('@clerk/express');
const multer = require("multer");
const { uploadResume } = require("../controllers/resumeController");

// Use memory storage to avoid missing directory issues on Render
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("resume"), uploadResume);

module.exports = router;
