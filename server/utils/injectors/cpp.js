const { getType } = require('./common');

function cppInjector(userCode, method_name, testCasesInputs, problemDetails, parameters) {
  const returnType = getType(problemDetails.return_type, 'c++');

  // ── Parameter parsing ────────────────────────────────────────────────────────
  const paramParsing = parameters.map((p, idx) => {
    const cppType = getType(p.type, 'c++');
    const parser = getParser(cppType);
    // No const — solutions may take params by non-const reference
    return `${cppType} ${p.name} = judge::${parser}(args[${idx}]);`;
  }).join('\n            ');

  const callArgs = parameters.map(p => p.name).join(', ');

  // Escape backslashes FIRST, then quotes — order matters
  const formattedTestInputs = testCasesInputs
    .map(t => '"' + t.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"')
    .join(', ');

  const timeoutSeconds = 5;

  return `
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <stdexcept>
#include <algorithm>
#include <queue>
#include <climits>
#include <limits>
#include <cmath>
#include <cctype>
#include <csignal>
#include <cstdlib>
#include <utility>
#include <unistd.h>

// ════════════════════════════════════════════════════════════════════════════
//  JUDGE NAMESPACE  — all driver helpers live here to avoid collisions with
//  user-defined names like trim(), split(), etc.
// ════════════════════════════════════════════════════════════════════════════
namespace judge {

// ── Data structures ──────────────────────────────────────────────────────────

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}
};

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v) : val(v), next(nullptr) {}
};

// ── String utilities ─────────────────────────────────────────────────────────

static std::string trim(const std::string& s) {
    size_t l = 0, r = s.size();
    while (l < r && std::isspace(static_cast<unsigned char>(s[l]))) ++l;
    while (r > l && std::isspace(static_cast<unsigned char>(s[r - 1]))) --r;
    return s.substr(l, r - l);
}

static std::string unescapeJsonString(const std::string& s) {
    std::string out;
    out.reserve(s.size());
    bool esc = false;
    for (char c : s) {
        if (!esc && c == '\\') { esc = true; continue; }
        if (esc) {
            switch (c) {
                case 'n':  out += '\\n'; break;
                case 'r':  out += '\\r'; break;
                case 't':  out += '\\t'; break;
                case '"':  out += '"';   break;
                case '\\': out += '\\\\'; break;
                default:   out += c;    break;
            }
            esc = false;
        } else {
            out += c;
        }
    }
    return out;
}

static std::string escapeJsonString(const std::string& s) {
    std::string out;
    out.reserve(s.size());
    for (char c : s) {
        switch (c) {
            case '"':  out += "\\\\\\""; break;
            case '\\\\': out += "\\\\\\\\"; break;
            case '\\n': out += "\\\\n";   break;
            case '\\r': out += "\\\\r";   break;
            case '\\t': out += "\\\\t";   break;
            default:   out += c;        break;
        }
    }
    return out;
}

// ── Top-level element splitter ───────────────────────────────────────────────
//  Splits "[a, [b,c], d]" → {"a", "[b,c]", "d"}
//  Handles nested arrays/objects and quoted strings with escape awareness.

static std::vector<std::string> splitTopLevelElements(const std::string& raw) {
    std::string src = trim(raw);
    if (src.size() >= 2 && src.front() == '[' && src.back() == ']')
        src = src.substr(1, src.size() - 2);

    std::vector<std::string> out;
    std::string cur;
    int depth = 0;
    bool inStr = false, esc = false;

    for (char c : src) {
        if (esc)          { cur += c; esc = false; continue; }
        if (c == '\\\\' && inStr) { cur += c; esc = true;  continue; }
        if (c == '"')     { inStr = !inStr; cur += c; continue; }
        if (!inStr) {
            if (c == '[' || c == '{') ++depth;
            else if (c == ']' || c == '}') --depth;
            else if (c == ',' && depth == 0) {
                std::string t = trim(cur);
                if (!t.empty()) out.push_back(t);
                cur.clear();
                continue;
            }
        }
        cur += c;
    }
    std::string t = trim(cur);
    if (!t.empty()) out.push_back(t);
    return out;
}

// ════════════════════════════════════════════════════════════════════════════
//  PARSERS
// ════════════════════════════════════════════════════════════════════════════

// ── Primitives ───────────────────────────────────────────────────────────────

static int parseInt(const std::string& raw)          { return std::stoi(trim(raw)); }
static long long parseLongLong(const std::string& raw) { return std::stoll(trim(raw)); }
static double parseDouble(const std::string& raw)    { return std::stod(trim(raw)); }
static float  parseFloat(const std::string& raw)     { return std::stof(trim(raw)); }

static char parseChar(const std::string& raw) {
    std::string v = trim(raw);
    // Accept "a" (quoted) or bare a
    if (v.size() >= 2 && v.front() == '"' && v.back() == '"') return v[1];
    return v.empty() ? '\\0' : v[0];
}

static bool parseBool(const std::string& raw) {
    std::string v = trim(raw);
    if (v == "true"  || v == "1") return true;
    if (v == "false" || v == "0") return false;
    throw std::runtime_error("Invalid bool: " + v);
}

static std::string parseString(const std::string& raw) {
    std::string v = trim(raw);
    if (v.size() >= 2 && v.front() == '"' && v.back() == '"')
        return unescapeJsonString(v.substr(1, v.size() - 2));
    return v;
}

// ── 1-D vectors ──────────────────────────────────────────────────────────────

static std::vector<int> parseVectorInt(const std::string& raw) {
    std::vector<int> out;
    for (const auto& e : splitTopLevelElements(raw))
        if (!e.empty()) out.push_back(parseInt(e));
    return out;
}

static std::vector<long long> parseVectorLongLong(const std::string& raw) {
    std::vector<long long> out;
    for (const auto& e : splitTopLevelElements(raw))
        if (!e.empty()) out.push_back(parseLongLong(e));
    return out;
}

static std::vector<double> parseVectorDouble(const std::string& raw) {
    std::vector<double> out;
    for (const auto& e : splitTopLevelElements(raw))
        if (!e.empty()) out.push_back(parseDouble(e));
    return out;
}

static std::vector<char> parseVectorChar(const std::string& raw) {
    std::vector<char> out;
    for (const auto& e : splitTopLevelElements(raw))
        if (!e.empty()) out.push_back(parseChar(e));
    return out;
}

static std::vector<bool> parseVectorBool(const std::string& raw) {
    std::vector<bool> out;
    for (const auto& e : splitTopLevelElements(raw))
        if (!e.empty()) out.push_back(parseBool(e));
    return out;
}

static std::vector<std::string> parseVectorString(const std::string& raw) {
    std::vector<std::string> out;
    for (const auto& e : splitTopLevelElements(raw))
        out.push_back(parseString(e));
    return out;
}

// ── 2-D vectors ──────────────────────────────────────────────────────────────

static std::vector<std::vector<int>> parseVectorVectorInt(const std::string& raw) {
    std::vector<std::vector<int>> out;
    for (const auto& row : splitTopLevelElements(raw))
        out.push_back(parseVectorInt(row));
    return out;
}

static std::vector<std::vector<char>> parseVectorVectorChar(const std::string& raw) {
    std::vector<std::vector<char>> out;
    for (const auto& row : splitTopLevelElements(raw))
        out.push_back(parseVectorChar(row));
    return out;
}

static std::vector<std::vector<std::string>> parseVectorVectorString(const std::string& raw) {
    std::vector<std::vector<std::string>> out;
    for (const auto& row : splitTopLevelElements(raw))
        out.push_back(parseVectorString(row));
    return out;
}

// ── Pair ─────────────────────────────────────────────────────────────────────
//  Accepts [a, b]

static std::pair<int,int> parsePairIntInt(const std::string& raw) {
    auto elems = splitTopLevelElements(raw);
    if (elems.size() != 2) throw std::runtime_error("parsePairIntInt: expected 2 elements");
    return { parseInt(elems[0]), parseInt(elems[1]) };
}

// ── TreeNode ─────────────────────────────────────────────────────────────────
//  LeetCode-style level-order: [1,2,3,null,null,4,5]

static TreeNode* parseTreeNode(const std::string& raw) {
    auto tokens = splitTopLevelElements(raw);
    if (tokens.empty() || tokens[0] == "null" || tokens[0].empty()) return nullptr;

    TreeNode* root = new TreeNode(parseInt(tokens[0]));
    std::queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;

    while (!q.empty() && i < tokens.size()) {
        TreeNode* node = q.front(); q.pop();

        // left
        if (i < tokens.size()) {
            std::string t = trim(tokens[i++]);
            if (t != "null" && !t.empty()) {
                node->left = new TreeNode(parseInt(t));
                q.push(node->left);
            }
        }
        // right
        if (i < tokens.size()) {
            std::string t = trim(tokens[i++]);
            if (t != "null" && !t.empty()) {
                node->right = new TreeNode(parseInt(t));
                q.push(node->right);
            }
        }
    }
    return root;
}

// ── ListNode ─────────────────────────────────────────────────────────────────
//  Accepts [1,2,3,4,5]

static ListNode* parseListNode(const std::string& raw) {
    auto tokens = splitTopLevelElements(raw);
    if (tokens.empty()) return nullptr;
    ListNode dummy(0);
    ListNode* cur = &dummy;
    for (const auto& t : tokens) {
        if (!trim(t).empty()) {
            cur->next = new ListNode(parseInt(t));
            cur = cur->next;
        }
    }
    return dummy.next;
}

// ════════════════════════════════════════════════════════════════════════════
//  FORMATTERS  (strict JSON)
// ════════════════════════════════════════════════════════════════════════════

// Forward declarations for mutual recursion
static std::string toJson(TreeNode* node);
static std::string toJson(ListNode* node);

static std::string toJson(bool v)        { return v ? "true" : "false"; }
static std::string toJson(char v)        { return std::string("\\"") + v + "\\""; }
static std::string toJson(int v)         { return std::to_string(v); }
static std::string toJson(long long v)   { return std::to_string(v); }
static std::string toJson(double v) {
    // Avoid scientific notation for reasonable values; strip trailing zeros
    std::ostringstream oss;
    oss << v;
    return oss.str();
}
static std::string toJson(float v)       { return toJson(static_cast<double>(v)); }
static std::string toJson(const std::string& v) {
    return "\\"" + escapeJsonString(v) + "\\"";
}

// pair<int,int>
static std::string toJson(const std::pair<int,int>& p) {
    return "[" + std::to_string(p.first) + "," + std::to_string(p.second) + "]";
}

// vector<T> — works for any T that has a toJson overload
template <typename T>
static std::string toJsonVec(const std::vector<T>& v) {
    std::string out = "[";
    for (size_t i = 0; i < v.size(); ++i) {
        out += toJson(v[i]);
        if (i + 1 < v.size()) out += ",";
    }
    return out + "]";
}

static std::string toJson(const std::vector<int>& v)         { return toJsonVec(v); }
static std::string toJson(const std::vector<long long>& v)   { return toJsonVec(v); }
static std::string toJson(const std::vector<double>& v)      { return toJsonVec(v); }
static std::string toJson(const std::vector<float>& v)       { return toJsonVec(v); }
static std::string toJson(const std::vector<char>& v)        { return toJsonVec(v); }
static std::string toJson(const std::vector<bool>& v)        { return toJsonVec(v); }
static std::string toJson(const std::vector<std::string>& v) { return toJsonVec(v); }

static std::string toJson(const std::vector<std::vector<int>>& v)  { return toJsonVec(v); }
static std::string toJson(const std::vector<std::vector<char>>& v) { return toJsonVec(v); }
static std::string toJson(const std::vector<std::vector<std::string>>& v) { return toJsonVec(v); }

// TreeNode — level-order, trailing nulls stripped
static std::string toJson(TreeNode* root) {
    if (!root) return "null";
    std::vector<std::string> tokens;
    std::queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        TreeNode* node = q.front(); q.pop();
        if (!node) {
            tokens.push_back("null");
        } else {
            tokens.push_back(std::to_string(node->val));
            q.push(node->left);
            q.push(node->right);
        }
    }
    // Strip trailing nulls
    while (!tokens.empty() && tokens.back() == "null") tokens.pop_back();
    std::string out = "[";
    for (size_t i = 0; i < tokens.size(); ++i) {
        out += tokens[i];
        if (i + 1 < tokens.size()) out += ",";
    }
    return out + "]";
}

// ListNode — array output, cycle-safe (10 000 node limit)
static std::string toJson(ListNode* head) {
    std::string out = "[";
    ListNode* cur = head;
    int limit = 10000;
    bool first = true;
    while (cur && limit-- > 0) {
        if (!first) out += ",";
        out += std::to_string(cur->val);
        cur = cur->next;
        first = false;
    }
    return out + "]";
}

} // namespace judge

// ════════════════════════════════════════════════════════════════════════════
//  TLE SIGNAL HANDLER
// ════════════════════════════════════════════════════════════════════════════
static bool g_tle_triggered = false;

static void tleSigHandler(int) {
    // Minimal async-signal-safe output then abort
    const char msg[] = "[{\\"error\\": \\"Time Limit Exceeded\\"}]\\n";
    write(STDOUT_FILENO, msg, sizeof(msg) - 1);
    _exit(1);
}

// ════════════════════════════════════════════════════════════════════════════
//  USER SOLUTION
// ════════════════════════════════════════════════════════════════════════════
${userCode}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════════════════════════════════
int main() {
    // Install TLE guard — fires after ${timeoutSeconds}s total
    signal(SIGALRM, tleSigHandler);
    alarm(${timeoutSeconds});

    std::vector<std::string> testInputs = { ${formattedTestInputs} };
    std::cout << "[";
    Solution sol;

    for (size_t i = 0; i < testInputs.size(); ++i) {
        std::string result;
        try {
            std::vector<std::string> args = judge::splitTopLevelElements(testInputs[i]);
            if (args.size() != ${parameters.length}) {
                throw std::runtime_error(
                    "Expected ${parameters.length} argument(s), got " +
                    std::to_string(args.size()));
            }
            ${paramParsing}

            ${returnType} res = sol.${method_name}(${callArgs});
            result = "{\\"output\\": " + judge::toJson(res) + "}";
        } catch (const std::exception& ex) {
            result = "{\\"error\\": \\"" + judge::escapeJsonString(ex.what()) + "\\"}";
        } catch (...) {
            result = "{\\"error\\": \\"Unknown runtime error\\"}";
        }

        std::cout << result;
        if (i + 1 < testInputs.size()) std::cout << ",";
    }

    std::cout << "]" << std::endl;
    alarm(0); // cancel alarm on clean exit
    return 0;
}
`;
}

// ── Parser selector ──────────────────────────────────────────────────────────
//  Maps a C++ type string → judge:: parser function name

function getParser(cppType) {
  const map = {
    'int': 'parseInt',
    'long long': 'parseLongLong',
    'double': 'parseDouble',
    'float': 'parseFloat',
    'char': 'parseChar',
    'bool': 'parseBool',
    'std::string': 'parseString',

    'std::vector<int>': 'parseVectorInt',
    'std::vector<long long>': 'parseVectorLongLong',
    'std::vector<double>': 'parseVectorDouble',
    'std::vector<float>': 'parseVectorDouble',  // parsed as double, narrowed on assignment
    'std::vector<char>': 'parseVectorChar',
    'std::vector<bool>': 'parseVectorBool',
    'std::vector<std::string>': 'parseVectorString',

    'std::vector<std::vector<int>>': 'parseVectorVectorInt',
    'std::vector<std::vector<char>>': 'parseVectorVectorChar',
    'std::vector<std::vector<std::string>>': 'parseVectorVectorString',

    'std::pair<int,int>': 'parsePairIntInt',

    'TreeNode*': 'parseTreeNode',
    'ListNode*': 'parseListNode',

    // Graph as adjacency list — same as vector<vector<int>>
    'std::vector<std::vector<int>> /*graph*/': 'parseVectorVectorInt',
  };
  return map[cppType] || 'parseString'; // safe fallback
}

module.exports = cppInjector;