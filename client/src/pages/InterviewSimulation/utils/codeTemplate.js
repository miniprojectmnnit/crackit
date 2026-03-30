/**
 * Generates a code template/skeleton for a coding question.
 * @param {Object} question - The question object
 * @returns {string} Code template string
 */
export const generateCodeTemplate = (question, language = "JavaScript") => {
  let method = question.method_name;
  
  if (!method && question.title) {
    if (language.toLowerCase() === "python") {
      method = question.title.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
    } else {
      method = question.title.replace(/ /g, '').replace(/[^a-zA-Z0-9]/g, '');
      // Standardize first letter to lowercase for method names
      method = method.charAt(0).toLowerCase() + method.slice(1);
    }
  }
  
  if (!method) method = 'solve';

  let args = 'input';
  if (question.parameters && question.parameters.length > 0) {
    args = question.parameters.map(p => p.name).join(', ');
  } else if (question.test_cases && question.test_cases.length > 0) {
    args = 'input';
  }

  const commentStyle = language.toLowerCase() === "python" ? '"""' : '/**';
  const commentEnd = language.toLowerCase() === "python" ? '"""' : ' */';
  const commentPrefix = language.toLowerCase() === "python" ? '' : ' * ';

  const commentString = `${commentStyle}
${commentPrefix}PROBLEM DESCRIPTION:
${commentPrefix}${question.description || question.question_text || 'No description provided.'}
${commentPrefix}
${commentPrefix}NOTE: 
${commentPrefix}- Language: ${language}
${commentEnd}`;

  if (language.toLowerCase() === "python") {
    return `${commentString}\n\ndef ${method}(${args}):\n    # Write your code here...\n    pass\n`;
  } else if (language.toLowerCase() === "java") {
    return `${commentString}\n\nimport java.util.*;\n\npublic class MainWrapper {\n    public static void main(String[] args) {\n        // Write your code here...\n        \n    }\n}\n`;
  } else if (language.toLowerCase() === "c++") {
    return `${commentString}\n\n#include <iostream>\n#include <vector>\n#include <string>\n\nusing namespace std;\n\nint main() {\n    // Write your code here...\n    \n    return 0;\n}\n`;
  }

  return `${commentString}\n\nfunction ${method}(${args}) {\n  // Write your code here...\n  \n}\n`;
};
