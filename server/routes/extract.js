const express = require("express");
const { extractQuestions } = require("../controllers/extractController");

const { requireAuth } = require('@clerk/express');
const router = express.Router();

const unifiedAuth = () => (req, res, next) => {
  if (req.auth?.userId || req.extensionAuth?.userId) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized: Authentication required' });
};

router.post("/", unifiedAuth(), extractQuestions);

module.exports = router;