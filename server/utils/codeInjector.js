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
  
  // Map "c++" to "cpp" if that's how it's stored in snippets
  const snippetKey = (lang === "c++" || lang === "cpp") ? "cpp" : lang;
  const snippets = problemDetails.snippets;
  
  // Handle both Mongoose Map and regular Object
  const snippet = snippets ? (typeof snippets.get === 'function' ? snippets.get(snippetKey) : snippets[snippetKey]) : null;

  let method_name = snippet?.function_name || snippet?.method_name || determineMethodName(problemDetails, lang);
  let parameters = (snippet?.parameters && snippet.parameters.length > 0) ? snippet.parameters : (problemDetails.parameters || [{ name: "input", type: "any" }]);
  let return_type = snippet?.return_type || problemDetails.return_type || "any";

  // Provide a localized problemDetails-like object for injectors that expect it
  const localizedDetails = {
    ...problemDetails.toObject ? problemDetails.toObject() : problemDetails,
    method_name,
    parameters,
    return_type
  };

  const testCasesInputs = parseTestCases(testCases);
  const stringifiedTests = JSON.stringify(testCasesInputs);

  switch (lang) {
    case "python":
      return pythonInjector(userCode, method_name, stringifiedTests);
      
    case "javascript":
      return javascriptInjector(userCode, method_name, stringifiedTests);
      
    case "java":
      return javaInjector(userCode, method_name, testCasesInputs, localizedDetails, parameters);
      
    case "c++":
    case "cpp":
      return cppInjector(userCode, method_name, testCasesInputs, localizedDetails, parameters);
      
    default:
      throw new Error("Unsupported language: " + language);
  }
}

module.exports = { injectCode };
