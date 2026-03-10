const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

/**
 * Super basic sandboxed code execution for demonstration purposes.
 * WARNING: Running arbitrary code in production without Docker/Firecracker is dangerous.
 */
function executeCode(code, testCases) {
  return new Promise((resolve) => {
    const id = crypto.randomUUID();
    const tempFilePath = path.join(__dirname, `../temp_exec_${id}.js`);

    let executionWrapper = `
      try {
        ${code}
        
        const testCases = ${JSON.stringify(testCases)};
        let passed = 0;
        let failed = 0;
        const results = [];

        // In our mockup, the UI populates \`function solve()\` by default
        let funcToTest = null;
        if (typeof solve !== 'undefined' && typeof solve === 'function') {
          funcToTest = solve;
        } else {
          // Attempt to find ANY defined function in this local block using a simple regex proxy
          // For simplicity in this mockup, we'll enforce 'solve' or expect the LLM to write a self-executing block
        }

        if (!funcToTest) {
           console.log(JSON.stringify({ passed: 0, failed: testCases.length, error: "Execution missing function named 'solve'. Please define 'solve'." }));
           process.exit(0);
        }

        for (let tc of testCases) {
           try {
              // tc.input could be "1, 2" or "[1, 2, 3]"
              // tc.expected_output could be "3" or "[3, 2, 1]"
              
              const actual = eval(\`funcToTest(\${tc.input})\`);
              
              let expected = tc.expected_output;
              try { expected = eval(\`(\${tc.expected_output})\`); } catch(e){}

              if (String(actual) === String(expected) || JSON.stringify(actual) === JSON.stringify(expected)) {
                 passed++;
              } else {
                 failed++;
                 results.push({ input: tc.input, expected: tc.expected_output, actual: String(actual) });
              }
           } catch(e) {
              failed++;
              results.push({ input: tc.input, error: e.message });
           }
        }

        console.log(JSON.stringify({ passed, failed, results }));
      } catch (e) {
        console.log(JSON.stringify({ passed: 0, failed: ${testCases.length}, error: e.message || e.toString() }));
      }
    `;

    // For a minimal MVP, we return a mocked standard execution until the AST/wrapper is fully fleshed out.
    fs.writeFileSync(tempFilePath, executionWrapper);

    // Timeout of 3 seconds to prevent infinite loops
    exec(`node ${tempFilePath}`, { timeout: 3000 }, (error, stdout, stderr) => {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {}

      if (error) {
        if (error.killed) {
          return resolve({ passed: 0, failed: testCases.length, error: "Execution Timed Out" });
        }
        return resolve({ passed: 0, failed: testCases.length, error: stderr || stdout });
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (err) {
        resolve({ passed: 0, failed: testCases.length, error: stdout });
      }
    });
  });
}

module.exports = { executeCode };
