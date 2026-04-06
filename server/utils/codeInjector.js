const log = require("../utils/logger");
const { parseTestCases, determineMethodName } = require("./injectors/common");
const pythonInjector = require("./injectors/python");
const javascriptInjector = require("./injectors/javascript");
const javaInjector = require("./injectors/java");
const cppInjector = require("./injectors/cpp");

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

  const lang = language.toLowerCase();
  const method_name = determineMethodName(problemDetails, lang);
  const parameters = problemDetails.parameters || [{ name: "input", type: "any" }];
  const testCasesInputs = parseTestCases(testCases);
  const stringifiedTests = JSON.stringify(testCasesInputs);

  switch (lang) {
    case "python":
      return pythonInjector(userCode, method_name, stringifiedTests);
      
    case "javascript":
      return javascriptInjector(userCode, method_name, stringifiedTests);
      
    case "java":
      return javaInjector(userCode, method_name, testCasesInputs, problemDetails, parameters);
      
    case "c++":
      return cppInjector(userCode, method_name, testCasesInputs, problemDetails, parameters);
      
    default:
      throw new Error("Unsupported language: " + language);
  }
}

module.exports = { injectCode };
