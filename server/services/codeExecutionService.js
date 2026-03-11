const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const crypto = require("crypto");

function executeCode(code, testCases) {
  return new Promise((resolve) => {

    const id = crypto.randomUUID();
    const tempFile = path.join(__dirname, `../temp_exec_${id}.js`);

    const wrapper = `
"use strict";

function runTests() {
  try {

    ${code}

    if (typeof solve !== "function") {
      console.log(JSON.stringify({
        passed: 0,
        failed: ${testCases.length},
        error: "Function 'solve' is not defined"
      }));
      return;
    }

    const testCases = ${JSON.stringify(testCases)};
    let passed = 0;
    let failed = 0;
    const results = [];

    for (const tc of testCases) {

      try {

        let input;
        try {
          input = JSON.parse(tc.input);
        } catch {
          input = tc.input;
        }

        const actual = Array.isArray(input)
          ? solve(...input)
          : solve(input);

        let expected;
        try {
          expected = JSON.parse(tc.expected_output);
        } catch {
          expected = tc.expected_output;
        }

        const success =
          JSON.stringify(actual) === JSON.stringify(expected);

        if (success) {
          passed++;
        } else {
          failed++;
          results.push({
            input: tc.input,
            expected: tc.expected_output,
            actual
          });
        }

      } catch (err) {
        failed++;
        results.push({
          input: tc.input,
          error: err.message
        });
      }
    }

    console.log(JSON.stringify({ passed, failed, results }));

  } catch (err) {

    console.log(JSON.stringify({
      passed: 0,
      failed: ${testCases.length},
      error: err.message
    }));

  }
}

runTests();
`;

    try {
      fs.writeFileSync(tempFile, wrapper);
    } catch (err) {
      return resolve({
        passed: 0,
        failed: testCases.length,
        error: "Failed to write execution file"
      });
    }

    execFile(
      "node",
      [tempFile],
      { timeout: 3000 },
      (error, stdout, stderr) => {

        try { fs.unlinkSync(tempFile); } catch { }

        if (error) {

          if (error.killed) {
            return resolve({
              passed: 0,
              failed: testCases.length,
              error: "Execution timed out"
            });
          }

          return resolve({
            passed: 0,
            failed: testCases.length,
            error: stderr || stdout || error.message
          });
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch {
          resolve({
            passed: 0,
            failed: testCases.length,
            error: stdout
          });
        }
      }
    );

  });
}

module.exports = { executeCode };