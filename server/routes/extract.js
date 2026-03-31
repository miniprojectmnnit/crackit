const express = require("express");
const { extractQuestions } = require("../controllers/extractController");

const { requireAuth } = require('@clerk/express');
const router = express.Router();

router.post("/", requireAuth(), extractQuestions);

module.exports = router;