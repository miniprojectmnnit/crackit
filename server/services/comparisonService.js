//this one is responsible for grading it. It compares the user's output against the correct answer with extreme precision.

const log = require("../utils/logger");

/**
 * Validates if the actual output matches the expected output.
 * Does deep comparison for primitives, arrays, objects (Trees/LinkedLists).
 */
function deepCompare(actual, expected) {
  // Coerce string numbers if needed
  if (typeof actual === "string" && typeof expected === "number") {
    actual = Number(actual);
  } else if (typeof actual === "number" && typeof expected === "string") {
    expected = Number(expected);
  }

  // Handle Primitives
  if (typeof actual !== "object" || actual === null || typeof expected !== "object" || expected === null) {
    if (actual === expected) return true;

    // Sometimes boolean comes as string
    if (String(actual).toLowerCase() === String(expected).toLowerCase()) return true;

    return false;
  }

  // Handle Arrays
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return false;
    for (let i = 0; i < actual.length; i++) {
      if (!deepCompare(actual[i], expected[i])) return false;
    }
    return true;
  }

  // Handle Objects (Can be TreeNodes, ListNodes parsed from JSON)
  // Usually tree nodes have val, left, right.
  // Linked lists have val, next.
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();

  if (actualKeys.length !== expectedKeys.length) return false;

  for (const key of actualKeys) {
    if (!deepCompare(actual[key], expected[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Engine compares multiple test cases.
 * Outputs an array of results with passed statuses.
 */
//This function takes the raw data back from the execution engine (like Judge0) and runs it through the grader.
function runComparisonEngine(testCases, judge0StdoutData) {
  log.info("COMPARISON", `Running deep comparison engine for ${testCases.length} testcases`);

  // judge0StdoutData is assumed to be a JSON array of outputs e.g. [{"output": 5}, {"output": 10}]
  let executionResults = [];
  try {
    executionResults = JSON.parse(judge0StdoutData);
  } catch (e) {
    log.error("COMPARISON", `Failed to parse Judge0 stdout: ${judge0StdoutData}`);
    // return all failed
    return {
      passed: 0,
      failed: testCases.length,
      error: "Failed to parse JSON output from execution: " + e.message,
      results: testCases.map(tc => ({
        input: tc.input,
        expected: tc.expected_output,
        actual: null,
        error: "Parse error"
      }))
    };
  }

  let passed = 0;
  let failed = 0;
  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const execRes = executionResults[i] || {};

    // Parse expected output from string if it represents JSON
    let expectedParsed;
    try {
      expectedParsed = JSON.parse(tc.expected_output);
    } catch {
      expectedParsed = tc.expected_output;
    }

    if (execRes.error) {
      failed++;
      results.push({
        input: tc.input,
        expected: tc.expected_output,
        actual: execRes.error,
        status: "Error"
      });
      continue;
    }

    const actual = execRes.output;
    const isPass = deepCompare(actual, expectedParsed);

    if (isPass) {
      passed++;
      results.push({
        input: tc.input,
        expected: tc.expected_output,
        actual: actual,
        status: "Passed"
      });
    } else {
      failed++;
      log.warn("COMPARISON", `Test failed. Expected: ${JSON.stringify(expectedParsed)}, Actual: ${JSON.stringify(actual)}`);
      results.push({
        input: tc.input,
        expected: tc.expected_output,
        actual: actual,
        status: "Failed"
      });
    }
  }

  return { passed, failed, results };
}

module.exports = { runComparisonEngine, deepCompare };
