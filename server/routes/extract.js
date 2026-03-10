const express = require("express");
const { extractQuestions } = require("../controllers/extractController");

const router = express.Router();

router.post("/", extractQuestions);

module.exports = router;