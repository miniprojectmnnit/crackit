const log = require("../utils/logger");

/**
 * Injects user code into a language-specific driver template.
 * The driver code is responsible for passing inputs to the user's function
 * and printing the serialized outputs as a JSON array string to stdout.
 */
function injectCode(userCode, language, problemDetails, testCases) {
  log.info("INJECTOR", `Injecting user code for language: ${language}`);
  
  if (!problemDetails) {
    throw new Error("Problem details are required for code injection.");
  }

  // Determine method name based on language conventions (Must match frontend template logic)
  let method_name = problemDetails.method_name;
  const lang = language.toLowerCase();

  if (!method_name && problemDetails.title) {
    if (lang === "python") {
      method_name = problemDetails.title.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
    } else {
      method_name = problemDetails.title.replace(/ /g, '').replace(/[^a-zA-Z0-9]/g, '');
      method_name = method_name.charAt(0).toLowerCase() + method_name.slice(1);
    }
  }
  if (!method_name) method_name = 'solve';

  const parameters = problemDetails.parameters || [{ name: "input", type: "any" }];
  
  // Parse and normalize test inputs
  const testCasesInputs = testCases.map(tc => {
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

  const stringifiedTests = JSON.stringify(testCasesInputs); // "['[1,2]', '[3,4]']"

  const getType = (type, lang) => {
    if (!type) return lang === 'c++' ? 'int' : 'int';
    const t = type.toLowerCase().trim();
    if (t === 'string') return lang === 'c++' ? 'std::string' : 'String';
    if (t === 'integer' || t === 'int') return 'int';
    if (t === 'long') return lang === 'c++' ? 'long long' : 'long';
    if (t === 'double' || t === 'float') return 'double';
    if (t === 'boolean' || t === 'bool') return lang === 'c++' ? 'bool' : 'boolean';
    if (t.includes('[]') || t.includes('vector') || t.includes('list')) {
      const inner = t.replace('[]', '').replace('vector<', '').replace('list<', '').replace('>', '').trim();
      const innerMapped = getType(inner, lang);
      if (lang === 'c++') return `std::vector<${innerMapped}>`;
      if (lang === 'java') return `${innerMapped}[]`;
    }
    return lang === 'c++' ? 'auto' : 'Object';
  };

  if (language.toLowerCase() === "python") {
    return `
import json
import sys
import traceback

${userCode}

if __name__ == '__main__':
    test_inputs = ${stringifiedTests}
    results = []
    
    for raw_args in test_inputs:
        try:
            # Parse the JSON string array of arguments into python list
            args = json.loads(raw_args)
            
            # Assuming the function name is 'solve' if not provided
            method_to_call = globals().get('${method_name}', globals().get('solve'))
            
            if method_to_call:
                res = method_to_call(*args)
                results.append({"output": res})
            else:
                results.append({"error": "Method '${method_name}' not found."})
        except Exception as e:
            results.append({"error": str(e), "trace": traceback.format_exc()})
            
    print(json.dumps(results))
`;
  } else if (language.toLowerCase() === "javascript") {
    return `
${userCode}

function runTests() {
    const testInputs = ${stringifiedTests};
    const results = [];
    
    for (const rawArgs of testInputs) {
        try {
            const args = JSON.parse(rawArgs);
            const methodToCall = typeof ${method_name} === 'function' ? ${method_name} : (typeof solve === 'function' ? solve : null);
            
            if (methodToCall) {
                const res = methodToCall(...args);
                results.push({ output: res });
            } else {
                results.push({ error: "Method '${method_name}' not found." });
            }
        } catch (e) {
            results.push({ error: e.message, trace: e.stack });
        }
    }
    console.log(JSON.stringify(results));
}

runTests();
`;
  } else if (language.toLowerCase() === "java") {
    const returnType = getType(problemDetails.return_type, 'java');
    const javaParams = parameters.map(p => getType(p.type, 'java')).join(', ');
    
    return `
import java.util.*;

${userCode}

public class Main {
    public static void main(String[] args) {
        String[] testInputs = new String[] { ${testCasesInputs.map(t => '"' + t.replace(/"/g, '\\"') + '"').join(', ')} };
        System.out.print("[");
        Solution sol = new Solution();
        for (int i = 0; i < testInputs.length; i++) {
            try {
                String rawInput = testInputs[i];
                // In a production environment, we'd use a real JSON parser like Jackson or Gson.
                // For simplicity, we assume the input is correctly formatted for the method.
                // Note: Complex argument parsing for Java is skipped here for brevity.
                
                // Fallback for simple single-arg methods
                ${returnType} res = sol.${method_name}(rawInput); 
                System.out.print("{\\"output\\": " + formatJson(res) + "}");
            } catch (Exception e) {
                String msg = e.getMessage() != null ? e.getMessage().replace("\"", "\\\"") : "Error";
                System.out.print("{\\"error\\": \\"" + msg + "\\" }");
            }
            if (i < testInputs.length - 1) System.out.print(",");
        }
        System.out.println("]");
    }

    private static String formatJson(Object obj) {
        if (obj == null) return "null";
        if (obj instanceof String) return "\\"" + obj + "\\"";
        if (obj instanceof Boolean || obj instanceof Number) return obj.toString();
        if (obj instanceof int[]) return Arrays.toString((int[])obj);
        if (obj instanceof Object[]) return Arrays.deepToString((Object[])obj);
        return "\\"" + obj.toString() + "\\"";
    }
}
`;
  } else if (language.toLowerCase() === "c++") {
    const returnType = getType(problemDetails.return_type, 'c++');
    
    const paramParsing = parameters.map((p, idx) => {
      const cppType = getType(p.type, 'c++');
      let parser = 'parseStringValue';
      if (cppType === 'int') parser = 'parseIntValue';
      else if (cppType === 'long long') parser = 'parseLongLongValue';
      else if (cppType === 'double') parser = 'parseDoubleValue';
      else if (cppType === 'bool') parser = 'parseBoolValue';
      else if (cppType === 'std::vector<int>') parser = 'parseVectorIntValue';
      else if (cppType === 'std::vector<std::string>') parser = 'parseVectorStringValue';
      else if (cppType === 'std::vector<std::vector<int>>') parser = 'parseVectorVectorIntValue';
      
      return `const ${cppType} ${p.name} = ${parser}(args[${idx}]);`;
    }).join('\n              ');
    
    const callArgs = parameters.map(p => p.name).join(', ');

    return `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <sstream>
#include <type_traits>
#include <stdexcept>
#include <cctype>
#include <climits>
#include <limits>
#include <cmath>

${userCode}

  static std::string trim(const std::string& value) {
    size_t left = 0;
    size_t right = value.size();
    while (left < right && std::isspace(static_cast<unsigned char>(value[left]))) ++left;
    while (right > left && std::isspace(static_cast<unsigned char>(value[right - 1]))) --right;
    return value.substr(left, right - left);
  }

  static std::vector<std::string> splitTopLevelElements(const std::string& rawArray) {
    std::string source = trim(rawArray);
    if (source.size() >= 2 && source.front() == '[' && source.back() == ']') {
      source = source.substr(1, source.size() - 2);
    }

    std::vector<std::string> out;
    std::string current;
    int depth = 0;
    bool inString = false;
    bool escaped = false;

    for (char ch : source) {
      if (escaped) {
        current.push_back(ch);
        escaped = false;
        continue;
      }

      if (ch == '\\\\') {
        current.push_back(ch);
        escaped = true;
        continue;
      }

      if (ch == '"') {
        inString = !inString;
        current.push_back(ch);
        continue;
      }

      if (!inString) {
        if (ch == '[' || ch == '{') ++depth;
        if (ch == ']' || ch == '}') --depth;

        if (ch == ',' && depth == 0) {
          out.push_back(trim(current));
          current.clear();
          continue;
        }
      }

      current.push_back(ch);
    }

    if (!trim(current).empty()) {
      out.push_back(trim(current));
    }

    return out;
  }

  static std::string unescapeJsonString(const std::string& value) {
    std::string out;
    out.reserve(value.size());
    bool escaped = false;
    for (char ch : value) {
      if (!escaped && ch == '\\\\') {
        escaped = true;
        continue;
      }

      if (escaped) {
        switch (ch) {
          case 'n': out.push_back('\\n'); break;
          case 'r': out.push_back('\\r'); break;
          case 't': out.push_back('\\t'); break;
          case '"': out.push_back('"'); break;
          case '\\\\': out.push_back('\\\\'); break;
          default: out.push_back(ch); break;
        }
        escaped = false;
      } else {
        out.push_back(ch);
      }
    }
    return out;
  }

  static int parseIntValue(const std::string& raw) {
    return std::stoi(trim(raw));
  }

  static long long parseLongLongValue(const std::string& raw) {
    return std::stoll(trim(raw));
  }

  static double parseDoubleValue(const std::string& raw) {
    return std::stod(trim(raw));
  }

  static bool parseBoolValue(const std::string& raw) {
    std::string value = trim(raw);
    if (value == "true" || value == "1") return true;
    if (value == "false" || value == "0") return false;
    throw std::runtime_error("Invalid bool argument: " + value);
  }

  static std::string parseStringValue(const std::string& raw) {
    std::string value = trim(raw);
    if (value.size() >= 2 && value.front() == '"' && value.back() == '"') {
      return unescapeJsonString(value.substr(1, value.size() - 2));
    }
    return value;
  }

  static std::vector<int> parseVectorIntValue(const std::string& raw) {
    std::vector<int> out;
    for (const std::string& item : splitTopLevelElements(raw)) {
      if (!trim(item).empty()) out.push_back(parseIntValue(item));
    }
    return out;
  }

  static std::vector<std::string> parseVectorStringValue(const std::string& raw) {
    std::vector<std::string> out;
    for (const std::string& item : splitTopLevelElements(raw)) {
      out.push_back(parseStringValue(item));
    }
    return out;
  }

  static std::vector<std::vector<int>> parseVectorVectorIntValue(const std::string& raw) {
    std::vector<std::vector<int>> out;
    for (const std::string& item : splitTopLevelElements(raw)) {
      out.push_back(parseVectorIntValue(item));
    }
    return out;
  }

  static std::string escapeJson(const std::string& value) {
    std::string out;
    out.reserve(value.size());
    for (char ch : value) {
      switch (ch) {
        case '"': out += "\\\\\\""; break;
        case '\\\\': out += "\\\\\\\\"; break;
        case '\\n': out += "\\\\n"; break;
        case '\\r': out += "\\\\r"; break;
        case '\\t': out += "\\\\t"; break;
        default: out.push_back(ch); break;
      }
    }
    return out;
  }

  static std::string toJson(const std::string& value) {
    return "\\\"" + escapeJson(value) + "\\\"";
  }

  static std::string toJson(bool value) {
    return value ? "true" : "false";
  }

  template <typename T>
  static typename std::enable_if<std::is_arithmetic<T>::value && !std::is_same<T, bool>::value, std::string>::type toJson(const T& value) {
    std::ostringstream oss;
    oss << value;
    return oss.str();
  }

  template <typename T>
  static std::string toJson(const std::vector<T>& values) {
    std::string out = "[";
    for (size_t i = 0; i < values.size(); ++i) {
      out += toJson(values[i]);
      if (i + 1 < values.size()) out += ",";
    }
    out += "]";
    return out;
  }

  template <typename T>
  static typename std::enable_if<!std::is_arithmetic<T>::value, std::string>::type toJson(const T& value) {
    std::ostringstream oss;
    oss << value;
    return "\\\"" + escapeJson(oss.str()) + "\\\"";
  }

int main() {
    std::vector<std::string> testInputs = { ${testCasesInputs.map(t => '"' + t.replace(/"/g, '\\"') + '"').join(', ')} };
    std::cout << "[";
    Solution sol;
    for (size_t i = 0; i < testInputs.size(); ++i) {
        try {
            std::vector<std::string> args = splitTopLevelElements(testInputs[i]);
            if (args.size() != ${parameters.length}) {
                throw std::runtime_error("Expected ${parameters.length} argument(s), got " + std::to_string(args.size()));
            }
            ${paramParsing}
            ${returnType} res = sol.${method_name}(${callArgs});
            std::cout << "{\\"output\\": " << toJson(res) << "}";
        } catch (const std::exception& ex) {
            std::cout << "{\\"error\\": \\"" << escapeJson(ex.what()) << "\\" }";
        } catch (...) {
            std::cout << "{\\"error\\": \\"Execution error\\" }";
        }
        if (i < testInputs.size() - 1) std::cout << ",";
    }
    std::cout << "]" << std::endl;
    return 0;
}
`;
  }
  
  throw new Error("Unsupported language: " + language);
}

module.exports = { injectCode };
