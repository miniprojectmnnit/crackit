/**
 * Extracts and maps generic types (e.g., Integer Array) to language-specific types.
 */
function getType(type, lang) {
  if (!type) return lang === 'c++' ? 'int' : 'int';
  const t = type.toLowerCase().trim().replace(/&$/, "");
  if (t === 'string') return lang === 'c++' ? 'std::string' : 'String';
  if (t === 'integer' || t === 'int') return 'int';
  if (t === 'long') return lang === 'c++' ? 'long long' : 'long';
  if (t === 'double' || t === 'float') return 'double';
  if (t === 'boolean' || t === 'bool') return lang === 'c++' ? 'bool' : 'boolean';
  if (t === 'any') return lang === 'c++' ? 'int' : 'Object';
  
  if (t.includes('[]') || t.includes('vector') || t.includes('list')) {
    let inner = t.replace('[]', '').replace('vector<', '').replace('list<', '').replace('>', '').trim();
    if (!inner || inner === 'any' || inner === 'auto') {
        inner = 'int'; // Default to int for empty/any collection types in DSA
    }
    const innerMapped = getType(inner, lang);
    if (lang === 'c++') return `std::vector<${innerMapped}>`;
    if (lang === 'java') return `${innerMapped}[]`;
  }

  return lang === 'c++' ? 'int' : 'Object'; // Safer default than 'auto'
}

/**
 * Normalizes test case inputs based on LeetCode-style heuristics.
 */
function parseTestCases(testCases) {
  return testCases.map(tc => {
    let raw = tc.input.trim();
    // 1. Valid JSON?
    try {
      let parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) parsed = [parsed];
      return JSON.stringify(parsed);
    } catch {
      // 2. Leetcode heuristic (e.g. "nums = [1,2], m = 3" -> "[1,2], 3")
      try {
        let cleaned = raw.replace(/[a-zA-Z_]\w*\s*=\s*/g, '');
        let parsed = JSON.parse(`[${cleaned}]`);
        return JSON.stringify(parsed);
      } catch {
        // Fallback: pass single string arg
        return JSON.stringify([raw]);
      }
    }
  });
}

/**
 * Derives the method name based on language conventions if not provided.
 */
function determineMethodName(problemDetails, lang) {
  let method_name = problemDetails.method_name;
  
  if (!method_name && problemDetails.title) {
    if (lang === "python") {
      method_name = problemDetails.title.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
    } else {
      method_name = problemDetails.title.replace(/ /g, '').replace(/[^a-zA-Z0-9]/g, '');
      method_name = method_name.charAt(0).toLowerCase() + method_name.slice(1);
    }
  }
  
  return method_name || 'solve';
}

module.exports = {
  getType,
  parseTestCases,
  determineMethodName
};
