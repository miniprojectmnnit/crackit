/**
 * Generates a code template/skeleton for a coding question.
 * @param {Object} question - The question object
 * @returns {string} Code template string
 */
export const generateCodeTemplate = (question, language = "JavaScript") => {
  const method = question.method_name || (question.title ? question.title.replace(/ /g, '') : 'solve');

  let args = 'input';
  if (question.parameters && question.parameters.length > 0) {
    args = question.parameters.map(p => p.name).join(', ');
  } else if (question.test_cases && question.test_cases.length > 0) {
    args = 'input';
  }

  const commentString = `/**
 * PROBLEM DESCRIPTION:
 * ${question.description || question.question_text || 'No description provided.'}
 * 
 * NOTE: 
 * - Language: ${language}
 */`;

  if (language.toLowerCase() === "python") {
    return `${commentString}\n\ndef ${method}(${args}):\n    # Write your code here...\n    pass\n`;
  } else if (language.toLowerCase() === "java") {
    return `${commentString}\n\nimport java.util.*;\n\npublic class MainWrapper {\n    public static void main(String[] args) {\n        // For custom execution in Java, ensure you parse standard input correctly.\n        // Write your code here...\n        \n    }\n}\n`;
  } else if (language.toLowerCase() === "c++") {
    return `${commentString}\n\n#include <iostream>\n#include <vector>\n#include <string>\n\nusing namespace std;\n\nint main() {\n    // Write your code here...\n    \n    return 0;\n}\n`;
  }

  return `${commentString}\n\nfunction ${method}(${args}) {\n  // Write your code here...\n  \n}\n`;
};
