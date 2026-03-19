const express = require("express");
const router = express.Router();
const { requireAuth } = require('@clerk/express');
const multer = require("multer");
const { uploadResume } = require("../controllers/resumeController");

// Use standard temp directory or local uploads
const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("resume"), uploadResume);

module.exports = router;
