const express = require("express");
const router = express.Router();
const { requireAuth } = require('@clerk/express');
const multer = require("multer");
const { uploadResume } = require("../controllers/resumeController");

// Use memory storage to avoid missing directory issues on Render
//we are storing it on servers memory and not on disk because using disk it creates folder like /upload and it will create issues on modern Serverless /PaaS  Platforms
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("resume"), uploadResume);

module.exports = router;
