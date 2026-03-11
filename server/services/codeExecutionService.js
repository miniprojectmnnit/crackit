const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const crypto = require("crypto");
const log = require("../utils/logger");

function executeCode(code, testCases) {
  return new Promise((resolve) => {

    const id = crypto.randomUUID();
    const tempFile = path.join(__dirname, `../temp_exec_${id}.js`);

    log.info("CODE_EXEC", `🏃 Starting code execution — ${testCases.length} test cases, code: ${code.length} chars`);
    log.debug("CODE_EXEC", `📄 Temp file: temp_exec_${id}.js`);

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
      log.debug("CODE_EXEC", `📄 Temp file written successfully`);
    } catch (err) {
      log.error("CODE_EXEC", `Failed to write temp file: ${err.message}`);
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
        log.debug("CODE_EXEC", `🧹 Temp file cleaned up`);

        if (error) {

          if (error.killed) {
            log.warn("CODE_EXEC", `⏱️ Execution timed out (3s limit)`);
            return resolve({
              passed: 0,
              failed: testCases.length,
              error: "Execution timed out"
            });
          }

          log.error("CODE_EXEC", `Execution error: ${stderr || stdout || error.message}`);
          return resolve({
            passed: 0,
            failed: testCases.length,
            error: stderr || stdout || error.message
          });
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          log.success("CODE_EXEC", `✅ Execution complete — passed: ${parsed.passed}, failed: ${parsed.failed}`);
          resolve(parsed);
        } catch {
          log.error("CODE_EXEC", `Failed to parse execution output: ${stdout}`);
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