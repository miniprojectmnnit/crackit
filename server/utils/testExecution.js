require("dotenv").config({ path: __dirname + "/../.env" });
const { executeCodePipeline } = require("../services/executionService");
const log = require("./logger");

async function runTests() {
  log.info("TEST", "Starting Test Suites for Execution Engine...");

const mongoose = require("mongoose");
const Question = require("../models/Question");

async function runTests() {
  await mongoose.connect(process.env.MONGODB_URI);
  const q = await Question.findById("69c44887559bf691ce9da55c");
  if (q) {
    require('fs').writeFileSync('output.json', JSON.stringify({ test_cases: q.test_cases }, null, 2));
    console.log("Written test cases to output.json");
  } else {
    console.error("Question not found in DB!");
  }
  mongoose.disconnect();
}

  console.log("=========================================");
  console.log("🧪 TESTING PYTHON...");
  try {
    const pyResult = await executeCodePipeline(pythonUserCode, "Python", questionDetails, testCases);
    console.log(JSON.stringify(pyResult, null, 2));
  } catch (err) {
    console.error("Python test failed:", err.message);
  }
}

runTests().then(() => console.log("✅ FINISHED SCRIPT")).catch(e => console.error("❌ ERROR RUNNING SCRIPT:", e));
