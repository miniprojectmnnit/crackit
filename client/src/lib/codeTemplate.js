/**
 * Generates a code template/skeleton for a coding question.
 * @param {Object} question - The question object
 * @returns {string} Code template string
 */
export const generateCodeTemplate = (question, language = "JavaScript") => {
  const langKey = language.toLowerCase() === "c++" ? "cpp" : language.toLowerCase();
  const snippets = question.snippets || question.code_snippets || {};
  const snippet = snippets[langKey] || (typeof snippets.get === 'function' ? snippets.get(langKey) : null);

  if (snippet && (snippet.code || snippet.starter_code)) {
    return snippet.code || snippet.starter_code;
  }

  if (question.starter_code && language.toLowerCase() === "c++") {
    // Only use top-level fallback if it's actually C++ (unlikely if it's the JS one)
    if (question.starter_code.includes("class Solution") || question.starter_code.includes("#include")) {
        return question.starter_code;
    }
  }
  
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
  
  const getType = (type, lang) => {
    if (!type) return lang === 'c++' ? 'int' : 'int';
    const t = type.toLowerCase().trim();
    if (t === 'string') return lang === 'c++' ? 'string' : 'String';
    if (t === 'integer' || t === 'int') return 'int';
    if (t === 'long') return lang === 'c++' ? 'long long' : 'long';
    if (t === 'double' || t === 'float') return 'double';
    if (t === 'boolean' || t === 'bool') return lang === 'c++' ? 'bool' : 'boolean';
    if (t.includes('[]') || t.includes('vector') || t.includes('list')) {
      const inner = t.replace('[]', '').replace('vector<', '').replace('list<', '').replace('>', '').trim();
      const innerMapped = getType(inner, lang);
      if (lang === 'c++') return `vector<${innerMapped}>`;
      if (lang === 'java') return `${innerMapped}[]`;
    }
    return lang === 'c++' ? 'auto' : 'Object';
  };

  let args = 'input';
  if (question.parameters && question.parameters.length > 0) {
    if (language.toLowerCase() === "c++") {
      args = question.parameters.map(p => `${getType(p.type, 'c++')} ${p.name}`).join(', ');
    } else if (language.toLowerCase() === "java") {
      args = question.parameters.map(p => `${getType(p.type, 'java')} ${p.name}`).join(', ');
    } else {
      args = question.parameters.map(p => p.name).join(', ');
    }
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
    const returnType = getType(question.return_type, 'java');
    const defaultReturn = returnType === 'int' || returnType === 'long' || returnType === 'double' ? '0' : 
                         returnType === 'boolean' ? 'false' : 'null';
    return `${commentString}\n\nimport java.util.*;\n\nclass Solution {\n    public ${returnType} ${method}(${args}) {\n        // Write your code here...\n        return ${defaultReturn};\n    }\n}\n`;
  } else if (language.toLowerCase() === "c++") {
    const returnType = getType(question.return_type, 'c++');
    const defaultReturn = returnType === 'bool' ? 'false' : (returnType.includes('vector') ? '{}' : '0');
    return `${commentString}\n\n#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    ${returnType} ${method}(${args}) {\n        // Write your code here...\n        return ${defaultReturn}; \n    }\n};\n`;
  }

  return `${commentString}\n\nfunction ${method}(${args}) {\n  // Write your code here...\n  \n}\n`;
};
