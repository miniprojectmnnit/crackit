'use strict';

// ════════════════════════════════════════════════════════════════════════════
//  TYPE SYSTEM
//
//  Canonical type strings (stored in DB / problem definitions):
//
//    Primitives : integer, long, float, double, boolean, char, string, void
//    1-D        : integer[], string[], char[], boolean[], ...
//    2-D        : integer[][], char[][], ...
//    Generic    : list<integer>, list<string>, list<list<integer>>, ...
//    Special    : treenode, listnode
//
//  getType(type, lang) maps any of the above to the correct native type
//  string for Java, C++, Python, or JavaScript.
// ════════════════════════════════════════════════════════════════════════════

// ── Primitive map ─────────────────────────────────────────────────────────
//  [canonical] → { java, 'c++', python, javascript }
//  'java_boxed' is used when the type appears inside a generic (List<Integer>)

const PRIMITIVE_MAP = {
  integer: { java: 'int', java_boxed: 'Integer', 'c++': 'int', python: 'int', javascript: 'number' },
  int: { java: 'int', java_boxed: 'Integer', 'c++': 'int', python: 'int', javascript: 'number' },
  long: { java: 'long', java_boxed: 'Long', 'c++': 'long long', python: 'int', javascript: 'number' },
  float: { java: 'float', java_boxed: 'Float', 'c++': 'float', python: 'float', javascript: 'number' },
  double: { java: 'double', java_boxed: 'Double', 'c++': 'double', python: 'float', javascript: 'number' },
  boolean: { java: 'boolean', java_boxed: 'Boolean', 'c++': 'bool', python: 'bool', javascript: 'boolean' },
  bool: { java: 'boolean', java_boxed: 'Boolean', 'c++': 'bool', python: 'bool', javascript: 'boolean' },
  char: { java: 'char', java_boxed: 'Character', 'c++': 'char', python: 'str', javascript: 'string' },
  string: { java: 'String', java_boxed: 'String', 'c++': 'std::string', python: 'str', javascript: 'string' },
  str: { java: 'String', java_boxed: 'String', 'c++': 'std::string', python: 'str', javascript: 'string' },
  void: { java: 'void', java_boxed: 'Void', 'c++': 'void', python: 'None', javascript: 'void' },
  // Special data structures
  treenode: { java: 'TreeNode', java_boxed: 'TreeNode', 'c++': 'TreeNode*', python: 'Optional[TreeNode]', javascript: 'TreeNode' },
  listnode: { java: 'ListNode', java_boxed: 'ListNode', 'c++': 'ListNode*', python: 'Optional[ListNode]', javascript: 'ListNode' },
  // Common aliases used in problem definitions
  'tree node': { java: 'TreeNode', java_boxed: 'TreeNode', 'c++': 'TreeNode*', python: 'Optional[TreeNode]', javascript: 'TreeNode' },
  'linked list': { java: 'ListNode', java_boxed: 'ListNode', 'c++': 'ListNode*', python: 'Optional[ListNode]', javascript: 'ListNode' },
  node: { java: 'TreeNode', java_boxed: 'TreeNode', 'c++': 'TreeNode*', python: 'Optional[TreeNode]', javascript: 'TreeNode' },
};

// ── Inner-type extractor ──────────────────────────────────────────────────
//  Correctly extracts the first level of a generic type.
//  Examples:
//    "list<integer>"           → "integer"
//    "list<list<integer>>"     → "list<integer>"
//    "vector<vector<char>>"    → "vector<char>"
//    "integer[]"               → "integer"
//    "integer[][]"             → "integer[]"

function extractInnerType(t) {
  // Handle bracket notation: integer[][] → integer[]
  if (t.endsWith('[]')) return t.slice(0, -2);

  // Handle generic notation: find matching angle brackets
  const open = t.indexOf('<');
  if (open === -1) return null;
  // Find the matching closing bracket
  let depth = 0;
  for (let i = open; i < t.length; i++) {
    if (t[i] === '<') depth++;
    else if (t[i] === '>') {
      depth--;
      if (depth === 0) return t.slice(open + 1, i).trim();
    }
  }
  return null; // malformed
}

// ── Is collection? ────────────────────────────────────────────────────────

function isCollection(t) {
  return (
    t.endsWith('[]') ||
    t.startsWith('list<') ||
    t.startsWith('vector<') ||
    t.startsWith('array<') ||
    t.startsWith('arraylist<')
  );
}

// ── Is 2-D? ───────────────────────────────────────────────────────────────

function is2DCollection(t) {
  if (t.endsWith('[][]')) return true;
  if (!t.startsWith('list<') && !t.startsWith('vector<')) return false;
  const inner = extractInnerType(t);
  return inner !== null && isCollection(inner);
}

// ── Main type mapper ──────────────────────────────────────────────────────
//
//  @param {string} type  - Canonical type string (from DB / problem definition)
//  @param {string} lang  - 'java' | 'c++' | 'python' | 'javascript'
//  @param {boolean} boxed - If true, use Java boxed type (for generics)
//  @returns {string}

function getType(type, lang, boxed = false) {
  if (!type) {
    const defaults = { java: 'int', 'c++': 'int', python: 'int', javascript: 'number' };
    return defaults[lang] ?? 'int';
  }

  const t = type.toLowerCase().trim();

  // ── Primitive lookup ─────────────────────────────────────────────────
  if (PRIMITIVE_MAP[t]) {
    const entry = PRIMITIVE_MAP[t];
    if (lang === 'java' && boxed) return entry.java_boxed;
    return entry[lang] ?? entry.java;
  }

  // ── 2-D array shorthand: integer[][] ─────────────────────────────────
  if (t.endsWith('[][]')) {
    const inner = t.slice(0, -4);
    const innerMapped = getType(inner, lang);
    if (lang === 'c++') return `std::vector<std::vector<${innerMapped}>>`;
    if (lang === 'java') return `${innerMapped}[][]`;
    if (lang === 'python') return `List[List[${innerMapped}]]`;
    if (lang === 'javascript') return `Array`;
  }

  // ── 1-D array shorthand: integer[] ───────────────────────────────────
  if (t.endsWith('[]')) {
    const inner = t.slice(0, -2);
    const innerMapped = getType(inner, lang);
    const innerMappedBoxed = getType(inner, lang, true);  // for Java generics
    if (lang === 'c++') return `std::vector<${innerMapped}>`;
    if (lang === 'java') return `${innerMapped}[]`;
    if (lang === 'python') return `List[${innerMappedBoxed}]`;
    if (lang === 'javascript') return `Array`;
  }

  // ── Generic collection: list<T>, vector<T>, etc. ──────────────────────
  if (isCollection(t)) {
    const inner = extractInnerType(t);
    if (inner === null) {
      // Raw unparameterized list
      if (lang === 'c++') return 'std::vector<int>';
      if (lang === 'java') return 'List<Integer>';
      if (lang === 'python') return 'List';
      return 'Array';
    }

    const innerMapped = getType(inner, lang);
    const innerMappedBoxed = getType(inner, lang, true);

    if (lang === 'c++') return `std::vector<${innerMapped}>`;
    if (lang === 'java') return `List<${innerMappedBoxed}>`;
    if (lang === 'python') return `List[${innerMappedBoxed}]`;
    if (lang === 'javascript') return `Array`;
  }

  // ── Fallback ──────────────────────────────────────────────────────────
  const fallbacks = { java: 'Object', 'c++': 'auto', python: 'Any', javascript: 'any' };
  console.warn(`[common.js] getType: unrecognised type "${type}" for lang "${lang}" — falling back to ${fallbacks[lang]}`);
  return fallbacks[lang] ?? 'Object';
}

// ════════════════════════════════════════════════════════════════════════════
//  TEST CASE PARSER
//
//  Accepts a test case object with an `input` field (raw string from DB/UI).
//  Returns a JSON string representing an array of arguments:
//    e.g. "[[1,2,3],3]"   →  valid arg array for injectors
//
//  Parsing strategy (in order):
//    1. Try JSON.parse directly
//    2. Try multi-line LeetCode format (each line = one arg)
//    3. Try single-line LeetCode format (strip "var = " assignments)
//    4. Fallback: single string argument
// ════════════════════════════════════════════════════════════════════════════

/**
 * Strips "varName = " assignment prefixes from a single-line LeetCode input.
 * Handles quoted strings safely — won't strip "=" inside string values.
 *
 * Strategy: only strip if the "=" is preceded by an identifier token
 * and NOT inside a string literal.
 */
function stripAssignments(raw) {
  // Walk char by char to safely strip only top-level "ident = " patterns
  let result = '';
  let i = 0;
  const len = raw.length;

  while (i < len) {
    const ch = raw[i];

    // Skip quoted strings — copy verbatim
    if (ch === '"' || ch === "'") {
      const quote = ch;
      result += ch;
      i++;
      while (i < len) {
        const c = raw[i];
        if (c === '\\') { result += c + (raw[i + 1] ?? ''); i += 2; continue; }
        result += c;
        i++;
        if (c === quote) break;
      }
      continue;
    }

    // Look for "identifier =" pattern
    const identMatch = raw.slice(i).match(/^[a-zA-Z_]\w*\s*=\s*/);
    if (identMatch) {
      // Skip the assignment prefix — don't add to result
      i += identMatch[0].length;
      continue;
    }

    result += ch;
    i++;
  }
  return result.trim();
}

/**
 * Tries to parse a raw test input string into a JSON argument array.
 * Returns { args: Array, warning?: string } or throws on hard failure.
 */
function parseRawInput(raw) {
  const trimmed = raw.trim();

  // ── Strategy 1: direct JSON ───────────────────────────────────────────
  try {
    const parsed = JSON.parse(trimmed);
    // If it's already an array, treat each element as one argument
    if (Array.isArray(parsed)) return { args: parsed };
    // Scalar → single-arg
    return { args: [parsed] };
  } catch (_) { }

  // ── Strategy 2: multi-line LeetCode format ───────────────────────────
  //  nums = [2,7,11,15]
  //  target = 9
  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    try {
      const args = lines.map(line => {
        const stripped = stripAssignments(line);
        return JSON.parse(stripped);
      });
      return { args };
    } catch (_) { }

    // Try joining all lines as a comma-separated array
    try {
      const joined = lines.map(stripAssignments).join(', ');
      const parsed = JSON.parse(`[${joined}]`);
      return { args: parsed };
    } catch (_) { }
  }

  // ── Strategy 3: single-line with assignments ──────────────────────────
  //  "nums = [1,2,3], target = 9"
  try {
    const cleaned = stripAssignments(trimmed);
    const parsed = JSON.parse(`[${cleaned}]`);
    return { args: parsed };
  } catch (_) { }

  // ── Strategy 4: bare JSON array without outer brackets ────────────────
  //  "[1,2,3], 9"
  try {
    const parsed = JSON.parse(`[${trimmed}]`);
    return { args: parsed };
  } catch (_) { }

  // ── Fallback: pass raw string as single argument ──────────────────────
  return {
    args: [trimmed],
    warning: `Could not parse test case input "${trimmed.slice(0, 60)}..." — passing as raw string.`,
  };
}

/**
 * Normalises an array of test case objects into the format expected by all
 * injectors: an array of JSON strings, each representing an argument list.
 *
 * Input:  [{ input: "nums = [1,2,3]\ntarget = 9" }, ...]
 * Output: ['[[1,2,3],9]', ...]
 *
 * @param {Array<{input: string}|string>} testCases
 * @returns {{ parsed: string[], warnings: string[] }}
 */
function parseTestCases(testCases) {
  const parsed = [];
  const warnings = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const raw = typeof tc === 'string' ? tc : tc?.input;

    if (!raw || typeof raw !== 'string' || !raw.trim()) {
      warnings.push(`Test case ${i + 1}: empty input — skipping.`);
      continue;
    }

    const { args, warning } = parseRawInput(raw.trim());
    if (warning) warnings.push(`Test case ${i + 1}: ${warning}`);
    parsed.push(JSON.stringify(args));
  }

  return { parsed, warnings };
}

// ════════════════════════════════════════════════════════════════════════════
//  METHOD NAME DERIVER
//
//  Priority:
//    1. problemDetails.method_name (explicit, from DB)
//    2. Derived from problemDetails.title per language convention
//    3. Fallback: 'solve'
// ════════════════════════════════════════════════════════════════════════════

/**
 * Converts a problem title to the conventional method name for a given language.
 *
 * Examples:
 *   "Two Sum"          → java/c++/js: "twoSum"   python: "two_sum"
 *   "LRU Cache"        → java/c++/js: "lRUCache" python: "lru_cache"
 *   "N-Queens II"      → java/c++/js: "nQueensII" python: "n_queens_ii"
 */
function titleToMethodName(title, lang) {
  // Normalise: replace non-alphanumeric runs with a single space
  const words = title
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  if (words.length === 0) return 'solve';

  if (lang === 'python') {
    // snake_case
    return words.map(w => w.toLowerCase()).join('_');
  }

  // camelCase for Java, C++, JavaScript
  return words
    .map((w, idx) => idx === 0
      ? w.charAt(0).toLowerCase() + w.slice(1)
      : w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

/**
 * @param {object}  problemDetails
 * @param {string}  [problemDetails.method_name]
 * @param {string}  [problemDetails.title]
 * @param {string}  lang  - 'java' | 'c++' | 'python' | 'javascript'
 * @returns {string}
 */
function determineMethodName(problemDetails, lang) {
  if (problemDetails?.method_name?.trim()) {
    return problemDetails.method_name.trim();
  }

  if (problemDetails?.title?.trim()) {
    return titleToMethodName(problemDetails.title.trim(), lang);
  }

  return 'solve';
}

// ════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ════════════════════════════════════════════════════════════════════════════

module.exports = {
  getType,
  parseTestCases,
  determineMethodName,

  // Exposed for testing / advanced use
  extractInnerType,
  stripAssignments,
  parseRawInput,
  titleToMethodName,
  PRIMITIVE_MAP,
};