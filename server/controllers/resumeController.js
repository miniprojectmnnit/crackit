const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");
const log = require("../utils/logger");
const ResumeProfile = require("../models/ResumeProfile");
const { getAuth } = require('@clerk/express');
const { parseResumeText } = require("../agents/resumeAgent");

exports.uploadResume = async (req, res) => {
  try {
    const file = req.file;
    const auth = getAuth(req);
    const userId = auth.userId;

    if (!userId) {
      if (file) fs.unlinkSync(file.path);
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    log.info("RESUME", `📄 Processing uploaded resume - ${file.originalname}`);

    // 2. Extract Text
    let rawText = "";
    if (file.mimetype === "application/pdf") {
      const dataBuffer = fs.readFileSync(file.path);
      const data = await pdfParse(dataBuffer);
      rawText = data.text;
    } else if (file.mimetype === "text/plain") {
      rawText = fs.readFileSync(file.path, "utf-8");
    } else {
      // Clean up async processing if unsupported type
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: "Unsupported file type. Please upload PDF or TXT." });
    }

    log.info("RESUME", `📄 Extracted ${rawText.length} characters. Calling Agent...`);
    // Clean up file
    try {
      fs.unlinkSync(file.path);
    } catch (e) {
      log.warn("RESUME", `Failed to unlink file: ${e.message}`);
    }

    // 3. Parse via Agent
    const extractedData = await parseResumeText(rawText);

    // 4. Save to Database
    const resume = new ResumeProfile({
      userId: userId,
      candidate_info: extractedData.candidate_info,
      technical_skills: extractedData.technical_skills,
      projects: extractedData.projects,
      domain_scores: extractedData.domain_scores,
      raw_text: rawText
    });

    await resume.save();

    log.success("RESUME", `✅ Resume processed successfully. ID: ${resume._id}`);
    res.json(resume);

  } catch (err) {
    log.error("RESUME", `Error processing resume: ${err.message}`, err);
    res.status(500).json({ error: "Server error during resume processing" });
  }
};
