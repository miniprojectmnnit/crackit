console.log("Starting tests...");
require("dotenv").config({ path: "./server/.env" });
const { evaluateDsaTurn } = require("./server/agents/dsaInterviewAgent");

async function runTests() {
  try {
    const question = {
      title: "Two Sum",
      description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target."
    };

    console.log("--- TEST 1: Strict Verification (User claims solved without code) ---");
    const res1 = await evaluateDsaTurn(
      question, 
      "I have solved the question, please check it.", 
      "", // No code
      [], 
      0, 3, "intuition"
    );
    console.log("AI Response:", res1.ai_response);
    console.log("Move to next:", res1.move_to_next);

    console.log("\n--- TEST 2: Skip Attempt 1 (First time asking) ---");
    const res2 = await evaluateDsaTurn(
      question, 
      "I am stuck, can we move on to the next question?", 
      "", 
      [], 
      0, 3, "intuition"
    );
    console.log("AI Response:", res2.ai_response);
    console.log("Move to next:", res2.move_to_next);

    console.log("\n--- TEST 3: Skip Attempt 2 (Second time asking) ---");
    const history = [
      { role: "user", content: "can we move on to the next question?" },
      { role: "assistant", content: "I understand it's tough! Why don't you try thinking about a hash map approach? Or do you really want to skip?" }
    ];
    const res3 = await evaluateDsaTurn(
      question, 
      "Yes, please move on to the next question.", 
      "", 
      history, 
      0, 3, "intuition"
    );
    console.log("AI Response:", res3.ai_response);
    console.log("Move to next:", res3.move_to_next);
    
    console.log("\nAll tests completed!");
  } catch (err) {
    console.error("Caught error during test execution:");
    console.error(err);
    process.exit(1);
  }
}

runTests();
