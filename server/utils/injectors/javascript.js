function javascriptInjector(userCode, method_name, testCasesInputs) {

    // Escape backticks and backslashes so the user code embeds safely
    // inside the template literal that wraps it in the worker string.
    const safeUserCode = userCode
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${');

    const formattedTestInputs = JSON.stringify(testCasesInputs);

    return `
'use strict';

// ════════════════════════════════════════════════════════════════════════════
//  JUDGE RUNNER  (Node.js — executed as a worker_threads Worker)
//  Each submission runs in its own Worker so the main process can
//  call worker.terminate() to enforce the time limit.
// ════════════════════════════════════════════════════════════════════════════
const { workerData, parentPort } = require('worker_threads');

// ── Console hijack ────────────────────────────────────────────────────────
//  Capture any console.log / console.error calls the user makes so they
//  don't corrupt the JSON output, but still expose them as a debug field.
const _userLogs = [];
const _origLog   = console.log;
const _origError = console.error;
const _origWarn  = console.warn;
console.log   = (...a) => _userLogs.push(a.map(String).join(' '));
console.error = (...a) => _userLogs.push('[err] ' + a.map(String).join(' '));
console.warn  = (...a) => _userLogs.push('[warn] ' + a.map(String).join(' '));

// ── Data structures ───────────────────────────────────────────────────────

class TreeNode {
  constructor(val, left = null, right = null) {
    this.val   = val;
    this.left  = left;
    this.right = right;
  }
}

class ListNode {
  constructor(val, next = null) {
    this.val  = val;
    this.next = next;
  }
}

// ── TreeNode deserializer ─────────────────────────────────────────────────
//  Accepts a JS array already parsed by JSON.parse, e.g. [1, null, 2, 3]
//  which is the LeetCode level-order format.

function buildTreeFromArray(arr) {
  if (!arr || arr.length === 0 || arr[0] === null) return null;
  const root  = new TreeNode(arr[0]);
  const queue = [root];
  let i = 1;
  while (queue.length > 0 && i < arr.length) {
    const node = queue.shift();
    if (i < arr.length && arr[i] !== null) {
      node.left = new TreeNode(arr[i]);
      queue.push(node.left);
    }
    i++;
    if (i < arr.length && arr[i] !== null) {
      node.right = new TreeNode(arr[i]);
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

// ── TreeNode serializer ───────────────────────────────────────────────────
//  Level-order output, trailing nulls stripped.

function treeToArray(root) {
  if (!root) return null;
  const result = [];
  const queue  = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node === null) {
      result.push(null);
    } else {
      result.push(node.val);
      queue.push(node.left  ?? null);
      queue.push(node.right ?? null);
    }
  }
  // Strip trailing nulls
  while (result.length > 0 && result[result.length - 1] === null) result.pop();
  return result;
}

// ── ListNode deserializer ─────────────────────────────────────────────────
//  Accepts a plain JS array, e.g. [1, 2, 3, 4, 5]

function buildListFromArray(arr) {
  if (!arr || arr.length === 0) return null;
  const dummy = new ListNode(0);
  let cur = dummy;
  for (const v of arr) { cur.next = new ListNode(v); cur = cur.next; }
  return dummy.next;
}

// ── ListNode serializer ───────────────────────────────────────────────────
//  Cycle-safe (10 000 node limit).

function listToArray(head) {
  const result = [];
  let cur = head, limit = 10000;
  while (cur !== null && cur !== undefined && limit-- > 0) {
    result.push(cur.val);
    cur = cur.next;
  }
  return result;
}

// ── Output serializer ─────────────────────────────────────────────────────
//  Converts any return value to a plain JSON-safe structure.
//  Handles TreeNode, ListNode, Map, Set, and nested combinations.

function serializeOutput(val) {
  if (val === undefined)           return null;          // void / no return
  if (val === null)                return null;
  if (val instanceof TreeNode)     return treeToArray(val);
  if (val instanceof ListNode)     return listToArray(val);
  if (val instanceof Map)          return Object.fromEntries(val);
  if (val instanceof Set)          return Array.from(val);
  if (Array.isArray(val))          return val.map(serializeOutput);
  if (typeof val === 'object')     return val;           // plain object
  return val;                                            // primitive
}

// ── Sanitize stack trace ──────────────────────────────────────────────────
//  Strip absolute server paths — only expose the user-relevant lines.

function sanitizeStack(stack) {
  if (!stack) return undefined;
  return stack
    .split('\\n')
    .filter(line => !line.includes('node:') && !line.includes('worker_threads'))
    .map(line => line.replace(/\\(.*[\\/\\\\](.+?)\\)/g, '($2)'))  // strip dir paths
    .join('\\n')
    .trim();
}

// ── Method resolver ───────────────────────────────────────────────────────
//  Supports both LeetCode class style and bare function style.
//
//  Class style:   class Solution { twoSum(nums, target) { ... } }
//  Function style: function twoSum(nums, target) { ... }
//                  const twoSum = (nums, target) => { ... }

function resolveMethod(methodName) {
  // Try Solution class first (LeetCode standard)
  if (typeof Solution !== 'undefined') {
    const sol = new Solution();
    if (typeof sol[methodName] === 'function') {
      return (...args) => sol[methodName](...args);
    }
  }
  // Fall back to bare function in global scope
  // Use eval to look up by dynamic name safely within this closure
  try {
    const fn = eval(methodName); // eslint-disable-line no-eval
    if (typeof fn === 'function') return fn;
  } catch (_) {}
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
//  USER SOLUTION
// ════════════════════════════════════════════════════════════════════════════
${safeUserCode}

// ════════════════════════════════════════════════════════════════════════════
//  TEST RUNNER
// ════════════════════════════════════════════════════════════════════════════
function runTests() {
  const testInputs = ${formattedTestInputs};
  const results    = [];
  const method     = resolveMethod('${method_name}');

  for (const rawArgs of testInputs) {
    try {
      if (!method) {
        results.push({ error: "Method '${method_name}' not found. Make sure your class is named Solution or your function is named ${method_name}." });
        continue;
      }

      // rawArgs is already a JSON string like "[[1,2,3], 3]"
      const args = JSON.parse(rawArgs);
      if (!Array.isArray(args)) throw new Error('Test case args must be a JSON array.');

      const res = method(...args);
      results.push({
        output: serializeOutput(res),
        stdout: _userLogs.length > 0 ? _userLogs.join('\\n') : undefined,
      });
    } catch (e) {
      results.push({
        error: e.message || String(e),
        trace: sanitizeStack(e.stack),
        stdout: _userLogs.length > 0 ? _userLogs.join('\\n') : undefined,
      });
    }
    // Clear per-test logs so they don't bleed across test cases
    _userLogs.length = 0;
  }

  // Restore console (good hygiene if somehow still in same process)
  console.log   = _origLog;
  console.error = _origError;
  console.warn  = _origWarn;

  // Output the single JSON line the host process reads
  process.stdout.write(JSON.stringify(results) + '\\n');
}

runTests();
`;
}

// ════════════════════════════════════════════════════════════════════════════
//  WORKER RUNNER  (call this from your submission handler, not the injector)
//
//  Usage:
//    const { runInWorker } = require('./javascriptInjector');
//    const results = await runInWorker(injectedCode, { timeoutMs: 5000 });
//
//  This keeps the TLE logic here in one place rather than scattered across
//  your submission handler.
// ════════════════════════════════════════════════════════════════════════════
const { Worker } = require('worker_threads');

/**
 * Runs injected JS code in an isolated Worker thread.
 * Automatically terminates the worker on timeout.
 *
 * @param {string} code       - Full injected code string from javascriptInjector()
 * @param {object} options
 * @param {number} options.timeoutMs  - Kill timeout in ms (default 5000)
 * @returns {Promise<Array>}  - Parsed results array, or [{error: ...}] on TLE/crash
 */
async function runInWorker(code, { timeoutMs = 5000 } = {}) {
    return new Promise((resolve) => {
        let output = '';
        let settled = false;

        const worker = new Worker(code, { eval: true });

        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            worker.terminate();
            resolve([{ error: 'Time Limit Exceeded' }]);
        }, timeoutMs);

        worker.stdout?.on('data', (chunk) => { output += chunk.toString(); });

        worker.on('exit', (code) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            try {
                // stdout may contain the JSON results line
                const line = output.trim().split('\\n').pop();
                resolve(JSON.parse(line));
            } catch (_) {
                resolve([{ error: 'Failed to parse worker output', raw: output.trim() }]);
            }
        });

        worker.on('error', (err) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve([{ error: err.message || 'Worker error' }]);
        });
    });
}

module.exports = { javascriptInjector, runInWorker };