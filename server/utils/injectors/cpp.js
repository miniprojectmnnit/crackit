const { getType } = require('./common');

function cppInjector(userCode, method_name, testCasesInputs, problemDetails, parameters) {
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

    return `${cppType} ${p.name} = ${parser}(args[${idx}]);`;
  }).join('\n              ');

  const callArgs = parameters.map(p => p.name).join(', ');
  const formattedTestInputs = testCasesInputs.map(t => '"' + t.replace(/"/g, '\\"') + '"').join(', ');

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

using namespace std;

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
    std::vector<std::string> testInputs = { ${formattedTestInputs} };
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

module.exports = cppInjector;
