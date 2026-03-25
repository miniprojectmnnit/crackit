require("dotenv").config();
const mongoose = require("mongoose");
const Question = require("../models/Question");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const q = await Question.findById("69c44887559bf691ce9da55c");
  if (q) {
    require("fs").writeFileSync("output2.json", JSON.stringify(q.test_cases, null, 2));
  }
  process.exit();
}
run();
